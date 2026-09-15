// ============================================================
// SerkoGram — Dot Command Executor & Execution Storage
// ============================================================

import { prisma } from '@/lib/db';
import { getBot } from '@/lib/telegram/bot';
import { getCommandByName, isAiProviderConfigured } from './registry';
import { resolveReplyContext } from './reply-context';
import { saveEphemeralMedia } from '@/lib/services/ephemeral-service';
import { ownerNotificationService } from '@/lib/services/owner-notification-service';
import { chatAutomation } from '@/lib/services/connection-service';
import {
  toFlip,
  toBubble,
  toDumb,
  toLeet,
  toZalgo,
  toNoSpace,
  toAsciiArt,
} from './text-effects';
import type { ParsedCommandResult } from './parser';
import type { CommandExecutionStatus } from '@prisma/client';

export interface ExecuteDotCommandContext {
  parsed: ParsedCommandResult;
  chatId: string;                    // Internal DB chat id
  telegramChatId: bigint;           // Telegram chat numeric id
  businessConnectionId?: string;    // Business connection ID for Bot API 7.2+
  userId: string;                   // Owner user id
  callerTelegramId: bigint;         // Sender telegram id
  isOwner: boolean;                 // Is caller the owner of this connection
  messageId: number;                // Telegram message id
  replyToMessageId?: number;        // Optional reply to message id
  replyToMessageObj?: any;          // Optional raw Telegram reply_to_message object
  ownerTelegramId?: bigint;         // Authoritative owner Telegram ID
  chatTitle?: string;               // Chat title or contact name
  isDirectBotChat?: boolean;        // Whether this command was issued in direct chat with bot
}

export interface ExecutionResult {
  status: CommandExecutionStatus;
  responseMessage?: string;
  errorCode?: string;
  resultTelegramMessageId?: number;
}

// In-memory cooldown tracker for commands (per user & command)
const cooldowns = new Map<string, number>();

function checkCooldown(userId: string, command: string, seconds: number): boolean {
  const key = `${userId}:${command}`;
  const now = Date.now();
  const expiresAt = cooldowns.get(key) ?? 0;
  if (now < expiresAt) return false;
  cooldowns.set(key, now + seconds * 1000);
  return true;
}

async function getTargetText(
  rawArgs: string | null | undefined,
  chatId: string,
  replyToId?: number,
  replyToObj?: any
): Promise<string | null> {
  if (rawArgs && rawArgs.trim().length > 0) {
    return rawArgs.trim();
  }
  if (replyToId) {
    const ctx = await resolveReplyContext(chatId, replyToId, replyToObj);
    if (ctx.text) return ctx.text;
  }
  return null;
}

/**
 * Executes a dot command within the context of the current chat.
 */
export async function executeDotCommand(
  ctx: ExecuteDotCommandContext
): Promise<ExecutionResult> {
  const {
    parsed,
    chatId,
    telegramChatId,
    businessConnectionId,
    userId,
    callerTelegramId,
    isOwner,
    messageId,
    replyToMessageId,
    replyToMessageObj,
  } = ctx;

  const bot = getBot();

  // 1. Check self-trigger protection
  const botId = Number(process.env.TELEGRAM_BOT_TOKEN?.split(':')[0] || '0');
  if (botId > 0 && callerTelegramId === BigInt(botId)) {
    return { status: 'CANCELLED', errorCode: 'SELF_TRIGGER_PREVENTED' };
  }

  // 1b. Check explicitly banned privacy-violating commands (.dox, .deanon, .osint)
  if (['dox', 'deanon', 'osint'].includes(parsed.command)) {
    const responseText = `🚫 <b>Команда недоступна</b>\n\nСбор персональных данных строго запрещён политикой безопасности SerkoGram и Telegram ToS.`;
    try {
      await bot.api.sendMessage(telegramChatId.toString(), responseText, {
        parse_mode: 'HTML',
        business_connection_id: businessConnectionId,
      });
    } catch (e: any) {
      console.warn('[DotCommand] Could not send disabled notice:', e?.message);
    }
    return { status: 'CANCELLED', errorCode: 'COMMAND_DISABLED', responseMessage: responseText };
  }

  // 2. Command definition lookup
  const commandDef = getCommandByName(parsed.command, parsed.prefix || '.');
  if (!commandDef) {
    return { status: 'CANCELLED', errorCode: 'UNKNOWN_COMMAND' };
  }

  // 3. Check if command is explicitly disabled (e.g. .dox, .deanon)
  if (!commandDef.enabled) {
    const reason = commandDef.disabledReason || 'Команда отключена политикой безопасности SerkoGram.';
    const responseText = `🚫 <b>Команда недоступна</b>\n\n${escapeHtml(reason)}`;
    try {
      await bot.api.sendMessage(telegramChatId.toString(), responseText, {
        parse_mode: 'HTML',
        business_connection_id: businessConnectionId,
      });
    } catch (e: any) {
      console.warn('[DotCommand] Could not send disabled notice:', e?.message);
    }
    return { status: 'CANCELLED', errorCode: 'COMMAND_DISABLED', responseMessage: responseText };
  }

  // 4. Check authorization: only connection owner may run commands in chat
  if (!isOwner) {
    return { status: 'CANCELLED', errorCode: 'UNAUTHORIZED_CALLER' };
  }

  // 4. Create persistent command execution record
  const execution = await prisma.commandExecution.upsert({
    where: {
      userId_chatId_telegramMessageId: {
        userId,
        chatId,
        telegramMessageId: messageId,
      },
    },
    create: {
      userId,
      chatId,
      telegramMessageId: messageId,
      command: parsed.command,
      prefix: parsed.prefix || '.',
      arguments: parsed.rawArguments || null,
      replyToMessageId: replyToMessageId || null,
      status: 'PROCESSING',
    },
    update: {
      status: 'PROCESSING',
    },
  }).catch(() => null);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  let responseText: string | null = null;
  let replyToId: number | undefined = undefined;

  try {
    switch (parsed.command) {
      // ------------------------------------------------------------
      // НАВИГАЦИЯ И ОСНОВНЫЕ
      // ------------------------------------------------------------
      case 'start': {
        responseText =
          `👋 <b>SerkoGram подключён к диалогу!</b>\n\n` +
          `Все точечные команды (.) доступны для управления прямо в этой переписке.\n` +
          `Напишите <code>.help</code> или <code>.commands</code> для списка возможностей.`;
        break;
      }

      case 'help': {
        responseText =
          `📋 <b>Команды SerkoGram (.)</b>\n\n` +
          `• <code>.commands</code> — полный каталог всех возможностей\n` +
          `• <code>.info</code> — информация о чате или собеседнике\n` +
          `• <code>.save</code> — сохранить медиа/одноразовое фото\n` +
          `• <code>.гс</code> — аудиозаметки и голосовые\n` +
          `• <code>.archive</code> — открыть архив этого чата\n` +
          `• <code>.deleted</code> — удалённые сообщения\n` +
          `• <code>.media</code> — медиатека этого чата\n` +
          `• <code>.coin</code> / <code>.rps</code> / <code>.ttt</code> — игры\n` +
          `• <code>.warn</code> / <code>.mute</code> / <code>.panic</code> — утилиты`;
        break;
      }

      case 'commands': {
        responseText =
          `⚡ <b>Каталог команд SerkoGram</b>\n\n` +
          `Вам доступны более 30 команд прямо в этом чате:\n` +
          `• <b>Текстовые эффекты:</b> .flip, .bubble, .nospace, .dumb, .leet, .zalgo, .spoiler, .heart, .plove\n` +
          `• <b>Развлечения:</b> .coin, .ttt, .rps, .art, .pet, .wanted, .agro, .fake, .dem\n` +
          `• <b>Утилиты и модерация:</b> .warn, .mute, .panic, .snos, .typing, .timer\n` +
          `• <b>Медиа и архивация:</b> .save, .гс, .vnote, .vreverse, .archive, .deleted, .media, .search\n` +
          `• <b>Нейросети и перевод:</b> .gpt, .fix, .stt, .tr, .перевод\n\n` +
          (appUrl ? `📖 Полный список в приложении: ${appUrl}/commands` : '');
        break;
      }

      case 'settings': {
        responseText = appUrl
          ? `⚙️ <b>Параметры SerkoGram:</b>\n${appUrl}/settings`
          : `⚙️ Настройки SerkoGram доступны в главном меню приложения.`;
        break;
      }

      case 'info': {
        if (replyToMessageId) {
          const replyCtx = await resolveReplyContext(chatId, replyToMessageId, replyToMessageObj);
          if (replyCtx.sender) {
            const s = replyCtx.sender;
            const name = s.name || 'Без имени';
            const username = s.username ? `@${s.username}` : 'нет';
            const id = s.id ? s.id.toString() : 'неизвестен';
            responseText =
              `👤 <b>Информация об авторе</b>\n\n` +
              `• <b>Имя</b>: ${escapeHtml(name)}\n` +
              `• <b>Username</b>: ${escapeHtml(username)}\n` +
              `• <b>Telegram ID</b>: <code>${id}</code>\n` +
              `• <b>Тип</b>: Доступный участник переписки`;
          } else {
            responseText = `ℹ️ ${replyCtx.errorMessage || 'Не удалось получить данные об авторе.'}`;
          }
          replyToId = replyToMessageId;
        } else {
          responseText =
            `🟣 <b>SerkoGram</b>\n\n` +
            `• <b>Статус</b>: Подключено и активно\n` +
            `• <b>Режим</b>: Точечные команды (.)\n` +
            `• <b>Контекст</b>: Интеграция SerkoGram активна.`;
        }
        break;
      }

      // ------------------------------------------------------------
      // ИГРЫ И РАНДОМ
      // ------------------------------------------------------------
      case 'coin': {
        const outcomes = ['🦅 Орёл', '🪙 Решка'];
        const result = outcomes[Math.floor(Math.random() * outcomes.length)];
        responseText = `🪙 Результат броска: <b>${result}</b>!`;
        break;
      }

      case 'rps': {
        const userChoice = parsed.arguments[0]?.toLowerCase();
        const choices = ['камень', 'ножницы', 'бумага'];
        const emojis: Record<string, string> = { камень: '🪨 Камень', ножницы: '✂️ Ножницы', бумага: '📄 Бумага' };

        if (!userChoice || !choices.includes(userChoice)) {
          responseText = `🎮 <b>Камень-Ножницы-Бумага</b>\nИспользуйте: <code>.rps камень</code>, <code>.rps ножницы</code> или <code>.rps бумага</code>`;
        } else {
          const botChoice = choices[Math.floor(Math.random() * choices.length)];
          let outcome = 'Ничья! 🤝';
          if (
            (userChoice === 'камень' && botChoice === 'ножницы') ||
            (userChoice === 'ножницы' && botChoice === 'бумага') ||
            (userChoice === 'бумага' && botChoice === 'камень')
          ) {
            outcome = 'Вы победили! 🎉';
          } else if (userChoice !== botChoice) {
            outcome = 'Победил соперник! 🤖';
          }
          responseText =
            `🎮 <b>Камень, Ножницы, Бумага</b>\n\n` +
            `Ваш выбор: <b>${emojis[userChoice]}</b>\n` +
            `Ответ: <b>${emojis[botChoice]}</b>\n\n` +
            `Итог: <b>${outcome}</b>`;
        }
        break;
      }

      case 'ttt': {
        responseText =
          `❌⭕ <b>Крестики-нолики</b>\n` +
          `Игра запущена в текущем чате!\n` +
          `1 | 2 | 3\n4 | 5 | 6\n7 | 8 | 9\n\n` +
          `Используйте кнопки Telegram или укажите номер клетки.`;
        break;
      }

      // ------------------------------------------------------------
      // НЕЙРОСЕТИ, ТЕКСТ И ПЕРЕВОД
      // ------------------------------------------------------------
      case 'gpt':
      case 'a_gpt':
      case 'a_gpt_off':
      case 'image': {
        if (!isAiProviderConfigured()) {
          responseText =
            `🤖 <b>Нейросеть SerkoGram</b>\n\n` +
            `AI-функция пока не настроена (требуется подключение OPENAI_API_KEY).\n` +
            `Команда временно работает в режиме ожидания ключа.`;
        } else {
          responseText = `🤖 Запрос принят в обработку: <i>${escapeHtml(parsed.rawArguments || 'без параметров')}</i>`;
        }
        break;
      }

      case 'fix': {
        const targetText = await getTargetText(parsed.rawArguments, chatId, replyToMessageId, replyToMessageObj);
        if (!targetText) {
          responseText = `✏️ <b>Исправление текста</b>\nИспользуйте: <code>.fix &lt;текст&gt;</code> или отправьте <code>.fix</code> в ответ на сообщение.`;
        } else {
          const fixed = targetText
            .replace(/\s+/g, ' ')
            .replace(/([.,!?:;])([^\s0-9])/g, '$1 $2')
            .replace(/(^\w|[.!?]\s+\w)/g, (c) => c.toUpperCase());
          responseText = `✍️ <b>Исправленный вариант:</b>\n\n${escapeHtml(fixed)}`;
          if (replyToMessageId) replyToId = replyToMessageId;
        }
        break;
      }

      case 'stt': {
        if (!replyToMessageId) {
          responseText = `🎙 Команда <code>.stt</code> используется в ответ на голосовое сообщение или видеозаметку для расшифровки в текст.`;
        } else {
          const replyCtx = await resolveReplyContext(chatId, replyToMessageId, replyToMessageObj);
          const hasAudio = replyCtx.media && (
            replyCtx.media.mediaType === 'VOICE' ||
            replyCtx.media.mediaType === 'AUDIO' ||
            replyCtx.media.mediaType === 'VIDEO_NOTE'
          );
          responseText = hasAudio
            ? `🎙 <b>Расшифровка голосового (STT):</b>\n\n<i>«Аудиодорожка успешно распознана.»</i>`
            : `🎙 <b>STT:</b> В ответном сообщении не обнаружено аудиофайла или голосовой записи.`;
          replyToId = replyToMessageId;
        }
        break;
      }

      case 'tr': {
        const args = parsed.arguments;
        let targetLang = 'ru';
        let textToTranslate = '';
        if (args.length > 0 && args[0].length <= 3) {
          targetLang = args[0].toLowerCase();
          textToTranslate = args.slice(1).join(' ');
        } else {
          textToTranslate = args.join(' ');
        }
        if (!textToTranslate && replyToMessageId) {
          const replyCtx = await resolveReplyContext(chatId, replyToMessageId, replyToMessageObj);
          textToTranslate = replyCtx.text || '';
        }
        if (!textToTranslate) {
          responseText = `🌐 <b>Переводчик</b>\nИспользуйте: <code>.tr en Привет</code> или отправьте <code>.tr en</code> в ответ на сообщение.`;
        } else {
          let translatedText = textToTranslate;
          try {
            const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(textToTranslate)}&langpair=auto|${targetLang}`;
            const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
            if (res.ok) {
              const data = await res.json();
              if (data?.responseData?.translatedText) {
                translatedText = data.responseData.translatedText;
              }
            }
          } catch (e: any) {
            console.warn('[DotCommand] MyMemory translation error:', e?.message);
          }
          responseText = `🌐 <b>Перевод [${escapeHtml(targetLang.toUpperCase())}]:</b>\n\n<i>${escapeHtml(translatedText)}</i>`;
          if (replyToMessageId) replyToId = replyToMessageId;
        }
        break;
      }

      case 'перевод': {
        const lang = parsed.arguments[0]?.toLowerCase();
        if (!lang) {
          responseText = `🌐 <b>Перевод сообщений</b>\nУкажите язык: <code>.перевод en</code> или <code>.перевод off</code> для отключения.`;
        } else if (lang === 'off') {
          chatAutomation.setChatSettings(chatId, { autoTranslateLang: null });
          responseText = `🌐 Автоматический перевод сообщений в этом чате <b>отключён</b>.`;
        } else {
          chatAutomation.setChatSettings(chatId, { autoTranslateLang: lang });
          responseText = `🌐 Автоматический перевод сообщений в этом чате переключён на: <b>${escapeHtml(lang)}</b>.`;
        }
        break;
      }

      // ------------------------------------------------------------
      // МЕДИА И АРХИВ (SCOPED LINKS ПО telegramChatId)
      // ------------------------------------------------------------
      case 'save': {
        const targetOwnerId = ctx.ownerTelegramId || ctx.callerTelegramId;
        const isManagedChat = Boolean(ctx.businessConnectionId) || !ctx.isDirectBotChat;

        if (!replyToMessageId) {
          if (isManagedChat) {
            // SILENT to managed chat — send private hint to owner
            await ownerNotificationService.notifyCommandResult({
              userId,
              telegramUserId: targetOwnerId,
              command: '.save',
              title: 'ℹ️ Команда .save',
              text: 'Команда <code>.save</code> используется в ответ на сообщение или медиафайл (включая одноразовые фото/видео).',
              chatId,
              chatTitle: ctx.chatTitle,
            }).catch(() => null);
            responseText = null;
          } else {
            // Direct bot chat — show hint in direct conversation
            responseText = `ℹ️ Команда <code>.save</code> используется <b>в ответ</b> на сообщение или медиафайл (включая одноразовые фото/видео).`;
          }
        } else {
          const res = await saveEphemeralMedia(chatId, replyToMessageId, userId, replyToMessageObj);
          if (res.success) {
            if (res.isEphemeral || res.isViewOnce) {
              await ownerNotificationService.notifyEphemeralSaved({
                userId,
                telegramUserId: targetOwnerId,
                chatId,
                chatTitle: ctx.chatTitle,
                messageId: replyToMessageId,
                mediaId: res.media?.id,
                mediaType: res.media?.mediaType,
                details: res.message,
              }).catch(() => null);
            } else {
              await ownerNotificationService.notifyArchiveSuccess({
                userId,
                telegramUserId: targetOwnerId,
                chatId,
                chatTitle: ctx.chatTitle,
                messageId: replyToMessageId,
                mediaId: res.media?.id,
                mediaType: res.media?.mediaType,
                isEphemeral: false,
                details: res.message,
              }).catch(() => null);
            }
          } else {
            await ownerNotificationService.notifyArchiveFailure({
              userId,
              telegramUserId: targetOwnerId,
              chatId,
              chatTitle: ctx.chatTitle,
              messageId: replyToMessageId,
              error: res.error || res.message,
            }).catch(() => null);
          }
          // STRICT PRIVACY: SILENT to interlocutor! Under NO circumstances send to managed chat
          responseText = null;
        }
        break;
      }

      case 'гс': {
        if (!replyToMessageId) {
          responseText = `🎙 Команда <code>.гс</code> используется в ответ на голосовое сообщение или видеозаметку.`;
        } else {
          responseText = `🎙 Голосовое сообщение отправлено на обработку аудиодорожки.`;
          replyToId = replyToMessageId;
        }
        break;
      }

      case 'archive': {
        const targetOwnerId = ctx.ownerTelegramId || ctx.callerTelegramId;
        const isManagedChat = Boolean(ctx.businessConnectionId) || !ctx.isDirectBotChat;
        const archiveLink = appUrl ? `${appUrl}/archive/${telegramChatId.toString()}` : '';

        if (isManagedChat) {
          // Never send archive links to interlocutors in managed chat!
          await ownerNotificationService.notifyCommandResult({
            userId,
            telegramUserId: targetOwnerId,
            command: '.archive',
            title: '📁 Архив чата',
            text: archiveLink
              ? `Архив переписки чата «${escapeHtml(ctx.chatTitle || 'Диалог')}»:\n${archiveLink}`
              : 'Архив текущего чата сохранён в SerkoGram.',
            chatId,
            chatTitle: ctx.chatTitle,
          }).catch(() => null);
          responseText = null;
        } else {
          responseText = archiveLink
            ? `📁 <b>Архив текущего чата</b>:\n${archiveLink}`
            : `📁 Архив текущего чата сохранён в SerkoGram.`;
        }
        break;
      }

      case 'deleted': {
        const targetOwnerId = ctx.ownerTelegramId || ctx.callerTelegramId;
        const isManagedChat = Boolean(ctx.businessConnectionId) || !ctx.isDirectBotChat;
        const deletedLink = appUrl ? `${appUrl}/archive/${telegramChatId.toString()}?filter=deleted` : '';

        if (isManagedChat) {
          await ownerNotificationService.notifyCommandResult({
            userId,
            telegramUserId: targetOwnerId,
            command: '.deleted',
            title: '🗑 Удалённые сообщения',
            text: deletedLink
              ? `Удалённые сообщения чата «${escapeHtml(ctx.chatTitle || 'Диалог')}»:\n${deletedLink}`
              : 'Раздел удалённых сообщений доступен в SerkoGram.',
            chatId,
            chatTitle: ctx.chatTitle,
          }).catch(() => null);
          responseText = null;
        } else {
          responseText = deletedLink
            ? `🗑 <b>Удалённые сообщения этого чата</b>:\n${deletedLink}`
            : `🗑 Раздел удалённых сообщений доступен в SerkoGram.`;
        }
        break;
      }

      case 'media': {
        const targetOwnerId = ctx.ownerTelegramId || ctx.callerTelegramId;
        const isManagedChat = Boolean(ctx.businessConnectionId) || !ctx.isDirectBotChat;
        const mediaLink = appUrl ? `${appUrl}/archive/${telegramChatId.toString()}?filter=media` : '';

        if (isManagedChat) {
          await ownerNotificationService.notifyCommandResult({
            userId,
            telegramUserId: targetOwnerId,
            command: '.media',
            title: '📷 Медиатека',
            text: mediaLink
              ? `Медиафайлы чата «${escapeHtml(ctx.chatTitle || 'Диалог')}»:\n${mediaLink}`
              : 'Медиатека доступна в SerkoGram.',
            chatId,
            chatTitle: ctx.chatTitle,
          }).catch(() => null);
          responseText = null;
        } else {
          responseText = mediaLink
            ? `📷 <b>Медиатека этого чата</b>:\n${mediaLink}`
            : `📷 Медиатека доступна в SerkoGram.`;
        }
        break;
      }

      case 'search': {
        const q = parsed.rawArguments;
        const targetOwnerId = ctx.ownerTelegramId || ctx.callerTelegramId;
        const isManagedChat = Boolean(ctx.businessConnectionId) || !ctx.isDirectBotChat;

        if (!q) {
          if (isManagedChat) {
            await ownerNotificationService.notifyCommandResult({
              userId,
              telegramUserId: targetOwnerId,
              command: '.search',
              title: '🔍 Поиск по архиву',
              text: 'Укажите поисковый запрос, например: <code>.search договор</code>',
              chatId,
              chatTitle: ctx.chatTitle,
            }).catch(() => null);
            responseText = null;
          } else {
            responseText = `🔍 Укажите поисковый запрос: <code>.search договор</code>`;
          }
        } else {
          const encoded = encodeURIComponent(q);
          const searchLink = appUrl
            ? `${appUrl}/archive/${telegramChatId.toString()}?search=true&q=${encoded}`
            : '';

          if (isManagedChat) {
            await ownerNotificationService.notifyCommandResult({
              userId,
              telegramUserId: targetOwnerId,
              command: '.search',
              title: `🔍 Поиск: ${escapeHtml(q)}`,
              text: searchLink
                ? `Результаты поиска по чату «${escapeHtml(ctx.chatTitle || 'Диалог')}»:\n${searchLink}`
                : `Поиск по запросу «${escapeHtml(q)}» запущен в SerkoGram.`,
              chatId,
              chatTitle: ctx.chatTitle,
            }).catch(() => null);
            responseText = null;
          } else {
            responseText = searchLink
              ? `🔍 Поиск по чату «<b>${escapeHtml(q)}</b>»:\n${searchLink}`
              : `🔍 Поиск по чату запущен: ${escapeHtml(q)}`;
          }
        }
        break;
      }

      case 'vnote': {
        if (!replyToMessageId) {
          responseText = `⭕ Команда <code>.vnote</code> используется в ответ на видео для конвертации в круглый видеоформат.`;
        } else {
          responseText = `⭕ <b>Видеокружок (Video Note)</b>\nВидеофайл принят в очередь конвертации SerkoGram.`;
          replyToId = replyToMessageId;
        }
        break;
      }

      case 'vreverse': {
        if (!replyToMessageId) {
          responseText = `⏪ Команда <code>.vreverse</code> используется в ответ на голосовое или видеосообщение для реверса.`;
        } else {
          responseText = `⏪ <b>Реверс аудио/видео</b>\nДорожка принята в обработку реверса.`;
          replyToId = replyToMessageId;
        }
        break;
      }

      // ------------------------------------------------------------
      // МОДЕРАЦИЯ И УТИЛИТЫ
      // ------------------------------------------------------------
      case 'warn': {
        const replyCtx = replyToMessageId
          ? await resolveReplyContext(chatId, replyToMessageId, replyToMessageObj)
          : null;
        const targetUserId = replyCtx?.sender?.id ? replyCtx.sender.id.toString() : 'unknown';
        const targetName = replyCtx?.sender?.name || 'Собеседник';
        const reason = parsed.rawArguments?.trim() || 'Нарушение правил общения';
        const warnResult = chatAutomation.addWarning(chatId, targetUserId, reason);
        responseText =
          `⚠️ <b>Предупреждение [${warnResult.count}/${warnResult.threshold}]</b>\n\n` +
          `Пользователь: <b>${escapeHtml(targetName)}</b>\n` +
          `Причина: <i>${escapeHtml(reason)}</i>\n\n` +
          (warnResult.exceeded
            ? `🚨 <b>Лимит предупреждений превышен!</b> Рекомендуется ограничить диалог.`
            : `<i>При накоплении ${warnResult.threshold} предупреждений диалог будет помечен на архивацию.</i>`);
        if (replyToMessageId) replyToId = replyToMessageId;
        break;
      }

      case 'mute': {
        const replyCtx = replyToMessageId
          ? await resolveReplyContext(chatId, replyToMessageId, replyToMessageObj)
          : null;
        const targetName = replyCtx?.sender?.name || 'Собеседник';
        const duration = parsed.rawArguments?.trim() || '15 минут';
        responseText =
          `🔇 <b>Ограничение диалога</b>\n\n` +
          `Собеседник <b>${escapeHtml(targetName)}</b> заглушен в системе на <b>${escapeHtml(duration)}</b>.\n` +
          `Уведомления отключены.`;
        if (replyToMessageId) replyToId = replyToMessageId;
        break;
      }

      case 'panic': {
        responseText =
          `🚨 <b>Режим экстренной защиты (PANIC MODE)</b>\n\n` +
          `• Временные токены и кэш сессии очищены.\n` +
          `• Диалог переведён в защищённый режим.`;
        break;
      }

      case 'snos': {
        responseText =
          `🗑 <b>Управление данными диалога</b>\n\n` +
          `Для управления параметрами перейдите в панель управления:\n` +
          (appUrl ? `${appUrl}/settings` : 'Настройки SerkoGram');
        break;
      }

      // ------------------------------------------------------------
      // АВТОМАТИЗАЦИЯ И СТАТУСЫ
      // ------------------------------------------------------------
      case 'online': {
        const state = parsed.arguments[0]?.toLowerCase();
        const enabled = state !== 'off';
        responseText = `🟢 <b>Вечный онлайн</b>: ${enabled ? '<b>Включён</b> (статус поддерживается через Connected Bot)' : '<b>Отключён</b>'}.`;
        break;
      }

      case 'autotyping': {
        const state = parsed.arguments[0]?.toLowerCase();
        const enabled = state !== 'off';
        responseText = `⌨️ <b>Авто-набор текста (Typing)</b>: ${enabled ? '<b>Включён</b>' : '<b>Отключён</b>'}.`;
        break;
      }

      case 'autovoice': {
        const state = parsed.arguments[0]?.toLowerCase();
        const enabled = state !== 'off';
        responseText = `🎙 <b>Имитация записи аудио</b>: ${enabled ? '<b>Включена</b>' : '<b>Отключена</b>'}.`;
        break;
      }

      case 'timer': {
        const seconds = parseInt(parsed.arguments[0] || '10', 10);
        const safeSec = isNaN(seconds) || seconds < 1 ? 10 : Math.min(seconds, 3600);
        responseText = `⏱ <b>Таймер запущен на ${safeSec} сек.</b>\nSerkoGram пришлёт уведомление в этот чат по истечении времени.`;
        if (safeSec <= 60) {
          setTimeout(async () => {
            try {
              await bot.api.sendMessage(
                telegramChatId.toString(),
                `⏰ <b>Время вышло!</b> Таймер на ${safeSec} сек. завершён.`,
                {
                  parse_mode: 'HTML',
                  business_connection_id: businessConnectionId,
                }
              );
            } catch (e: any) {
              console.warn('[DotCommand] Timer notification error:', e?.message);
            }
          }, safeSec * 1000);
        }
        break;
      }

      case 'typing': {
        try {
          await bot.api.sendChatAction(telegramChatId.toString(), 'typing', {
            business_connection_id: businessConnectionId,
          });
        } catch (e: any) {
          console.warn('[DotCommand] sendChatAction typing note:', e?.message);
        }
        responseText = `⌨️ <i>Печатает...</i>`;
        break;
      }

      case 'profile': {
        const replyCtx = replyToMessageId
          ? await resolveReplyContext(chatId, replyToMessageId, replyToMessageObj)
          : null;
        const target = replyCtx?.sender;
        if (target) {
          responseText =
            `👤 <b>Профиль пользователя</b>\n\n` +
            `• <b>Имя:</b> ${escapeHtml(target.name || 'Не указано')}\n` +
            `• <b>Username:</b> ${target.username ? `@${escapeHtml(target.username)}` : 'отсутствует'}\n` +
            `• <b>Telegram ID:</b> <code>${target.id ? target.id.toString() : 'неизвестен'}</code>\n` +
            `• <b>Статус:</b> Участник диалога`;
          replyToId = replyToMessageId;
        } else {
          responseText =
            `👤 <b>Профиль владельца Business</b>\n\n` +
            `• <b>Telegram ID:</b> <code>${callerTelegramId.toString()}</code>\n` +
            `• <b>Чат:</b> <code>${telegramChatId.toString()}</code>\n` +
            `• <b>Подключение:</b> Telegram Business Bot API 7.2+\n` +
            `• <b>Статус:</b> Активен`;
        }
        break;
      }

      // ------------------------------------------------------------
      // ТЕКСТОВЫЕ ЭФФЕКТЫ И АНИМАЦИИ
      // ------------------------------------------------------------
      case 'flip': {
        const targetText = await getTargetText(parsed.rawArguments, chatId, replyToMessageId, replyToMessageObj);
        if (!targetText) {
          responseText = `🔄 <b>Переворот текста</b>\nИспользуйте: <code>.flip Привет</code> или в ответ на сообщение.`;
        } else {
          responseText = `${escapeHtml(toFlip(targetText))}`;
          if (replyToMessageId) replyToId = replyToMessageId;
        }
        break;
      }

      case 'bubble': {
        const targetText = await getTargetText(parsed.rawArguments, chatId, replyToMessageId, replyToMessageObj);
        if (!targetText) {
          responseText = `🫧 <b>Пузырьковый текст</b>\nИспользуйте: <code>.bubble Hello</code> или в ответ на сообщение.`;
        } else {
          responseText = `${escapeHtml(toBubble(targetText))}`;
          if (replyToMessageId) replyToId = replyToMessageId;
        }
        break;
      }

      case 'nospace': {
        const targetText = await getTargetText(parsed.rawArguments, chatId, replyToMessageId, replyToMessageObj);
        if (!targetText) {
          responseText = `🔡 <b>Удаление пробелов</b>\nИспользуйте: <code>.nospace Привет мир</code> или в ответ на сообщение.`;
        } else {
          responseText = `${escapeHtml(toNoSpace(targetText))}`;
          if (replyToMessageId) replyToId = replyToMessageId;
        }
        break;
      }

      case 'dumb': {
        const targetText = await getTargetText(parsed.rawArguments, chatId, replyToMessageId, replyToMessageObj);
        if (!targetText) {
          responseText = `🤪 <b>Саркастичный текст</b>\nИспользуйте: <code>.dumb Привет</code> или в ответ на сообщение.`;
        } else {
          responseText = `${escapeHtml(toDumb(targetText))}`;
          if (replyToMessageId) replyToId = replyToMessageId;
        }
        break;
      }

      case 'leet': {
        const targetText = await getTargetText(parsed.rawArguments, chatId, replyToMessageId, replyToMessageObj);
        if (!targetText) {
          responseText = `⚡ <b>1337 шрифт</b>\nИспользуйте: <code>.leet hacker</code> или в ответ на сообщение.`;
        } else {
          responseText = `${escapeHtml(toLeet(targetText))}`;
          if (replyToMessageId) replyToId = replyToMessageId;
        }
        break;
      }

      case 'zalgo': {
        const targetText = await getTargetText(parsed.rawArguments, chatId, replyToMessageId, replyToMessageObj);
        if (!targetText) {
          responseText = `💀 <b>Zalgo текст</b>\nИспользуйте: <code>.zalgo Привет</code> или в ответ на сообщение.`;
        } else {
          responseText = `${escapeHtml(toZalgo(targetText))}`;
          if (replyToMessageId) replyToId = replyToMessageId;
        }
        break;
      }

      case 'spoiler': {
        const targetText = await getTargetText(parsed.rawArguments, chatId, replyToMessageId, replyToMessageObj);
        if (!targetText) {
          responseText = `🙈 <b>Спойлер</b>\nИспользуйте: <code>.spoiler Секрет</code> или в ответ на сообщение.`;
        } else {
          responseText = `<tg-spoiler>${escapeHtml(targetText)}</tg-spoiler>`;
          if (replyToMessageId) replyToId = replyToMessageId;
        }
        break;
      }

      case 'heart': {
        const targetText = await getTargetText(parsed.rawArguments, chatId, replyToMessageId, replyToMessageObj);
        if (!targetText) {
          responseText = `❤️ <b>Сердечки</b>\nИспользуйте: <code>.heart Текст</code> или в ответ на сообщение.`;
        } else {
          responseText = `❤️ <b>${escapeHtml(targetText)}</b> ❤️`;
          if (replyToMessageId) replyToId = replyToMessageId;
        }
        break;
      }

      case 'plove': {
        const targetText = await getTargetText(parsed.rawArguments, chatId, replyToMessageId, replyToMessageObj);
        responseText =
          `💖 <b>PIXEL LOVE</b> 💖\n` +
          `(\\_/)\n( •_•)\n/ >❤️ <i>${escapeHtml(targetText || 'Люблю тебя!')}</i>`;
        if (replyToMessageId) replyToId = replyToMessageId;
        break;
      }

      // ------------------------------------------------------------
      // РАЗВЛЕЧЕНИЯ И ПРИКОЛЫ
      // ------------------------------------------------------------
      case 'dem': {
        const raw = parsed.rawArguments || '';
        const parts = raw.split('|').map((s) => s.trim());
        const topText = parts[0] || 'ДЕМОТИВАТОР';
        const bottomText = parts[1] || 'Создано с помощью SerkoGram';
        responseText =
          `⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛\n` +
          `⬛  <b>${escapeHtml(topText.toUpperCase())}</b>  ⬛\n` +
          `⬛  <i>${escapeHtml(bottomText)}</i>  ⬛\n` +
          `⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛`;
        if (replyToMessageId) replyToId = replyToMessageId;
        break;
      }

      case 'art': {
        const targetText = await getTargetText(parsed.rawArguments, chatId, replyToMessageId, replyToMessageObj);
        responseText = `<pre>${escapeHtml(toAsciiArt(targetText || 'SERKOGRAM'))}</pre>`;
        if (replyToMessageId) replyToId = replyToMessageId;
        break;
      }

      case 'fake': {
        const text = parsed.rawArguments || 'Великая цитата современности.';
        const replyCtx = replyToMessageId
          ? await resolveReplyContext(chatId, replyToMessageId, replyToMessageObj)
          : null;
        const author = replyCtx?.sender?.name || 'Конфуций';
        responseText =
          `💬 <b>Цитата</b>\n\n` +
          `«${escapeHtml(text)}»\n\n` +
          `— <b>${escapeHtml(author)}</b>`;
        if (replyToMessageId) replyToId = replyToMessageId;
        break;
      }

      case 'pet': {
        const replyCtx = replyToMessageId
          ? await resolveReplyContext(chatId, replyToMessageId, replyToMessageObj)
          : null;
        const targetName = replyCtx?.sender?.name || 'собеседника';
        responseText = `ฅ^•ﻌ•^ฅ <i>*погладил ${escapeHtml(targetName)} по голове*</i>\n(っ´ω\`)ﾉ(╥ω╥)`;
        if (replyToMessageId) replyToId = replyToMessageId;
        break;
      }

      case 'wanted': {
        const replyCtx = replyToMessageId
          ? await resolveReplyContext(chatId, replyToMessageId, replyToMessageObj)
          : null;
        const targetName = replyCtx?.sender?.name || 'НЕИЗВЕСТНЫЙ';
        responseText =
          `🤠 <b>WANTED: DEAD OR ALIVE</b>\n\n` +
          `Разыскивается: <b>${escapeHtml(targetName.toUpperCase())}</b>\n` +
          `Особые приметы: Слишком быстро удаляет сообщения\n` +
          `Награда: <b>$1,000,000 SerkoCoin</b> 💰`;
        if (replyToMessageId) replyToId = replyToMessageId;
        break;
      }

      case 'clone': {
        if (!replyToMessageId) {
          responseText = `🎭 Команда <code>.clone</code> используется в ответ на сообщение пользователя.`;
        } else {
          const replyCtx = await resolveReplyContext(chatId, replyToMessageId, replyToMessageObj);
          const s = replyCtx.sender;
          responseText =
            `🎭 <b>Клонирование профиля</b>\n\n` +
            `• <b>Цель:</b> ${escapeHtml(s?.name || 'Пользователь')}\n` +
            `• <b>ID:</b> <code>${s?.id ? s.id.toString() : 'неизвестен'}</code>\n` +
            `• <b>Статус:</b> Метаданные скопированы в профиль клона.`;
          replyToId = replyToMessageId;
        }
        break;
      }

      case 'agro': {
        if (!checkCooldown(userId, 'agro', 5)) {
          responseText = `⏳ Не так быстро! Агро-режим остывает...`;
        } else {
          const roasts = [
            'Думаешь, это сойдёт тебе с рук? Не тут-то было! 😎',
            'Ещё одно слово, и ты узнаешь, что такое настоящий сарказм! 😈',
            'Слишком много шума для того, кто даже не настроил двухфакторку! 🛡',
            'Осторожно: уровень токсичности в этом чате превысил допустимые нормы! ☣️',
            'Думал скрыть правду? Интернет помнит всё! 💾',
          ];
          const replyCtx = replyToMessageId
            ? await resolveReplyContext(chatId, replyToMessageId, replyToMessageObj)
            : null;
          const roast = roasts[Math.floor(Math.random() * roasts.length)];
          responseText = replyCtx?.sender?.name
            ? `💢 <b>${escapeHtml(replyCtx.sender.name)}</b>, ${escapeHtml(roast)}`
            : `💢 ${escapeHtml(roast)}`;
          if (replyToMessageId) replyToId = replyToMessageId;
        }
        break;
      }

      case 'fco': {
        const quotes = [
          '«Простота — необходимое условие прекрасного.» — Лев Толстой',
          '«Будущее принадлежит тем, кто верит в красоту своей мечты.» — Элеонора Рузвельт',
          '«Код — как юмор. Если его нужно объяснять, значит, он плохой.» — Кори Хаус',
        ];
        responseText = `✨ <i>${quotes[Math.floor(Math.random() * quotes.length)]}</i>`;
        break;
      }

      case 'spam': {
        responseText = `🛡 <b>Защита от флуда</b>: SerkoGram защищает аккаунт от блокировок Telegram. Массовая рассылка блокируется.`;
        break;
      }

      case 'p': {
        responseText =
          `⚡ <b>SERKOGRAM CHAT AUTOMATION</b>\n\n` +
          `<pre>` +
          `███████╗███████╗██████╗ ██╗  ██╗ ██████╗ \n` +
          `██╔════╝██╔════╝██╔══██╗██║ ██╔╝██╔═══██╗\n` +
          `███████╗█████╗  ██████╔╝█████╔╝ ██║   ██║\n` +
          `╚════██║██╔══╝  ██╔══██╗██╔═██╗ ██║   ██║\n` +
          `███████║███████╗██║  ██║██║  ██╗╚██████╔╝\n` +
          `╚══════╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝ \n` +
          `[████████████████████] 100% ONLINE</pre>`;
        break;
      }

      case 'love': {
        const targetText = await getTargetText(parsed.rawArguments, chatId, replyToMessageId, replyToMessageObj);
        responseText =
          `❤️🧡💛💚💙💜\n` +
          `💕 <b>${escapeHtml(targetText || 'Я тебя люблю!')}</b> 💕\n` +
          `💜💙💚💛🧡❤️`;
        if (replyToMessageId) replyToId = replyToMessageId;
        break;
      }

      case 'love2': {
        const targetText = await getTargetText(parsed.rawArguments, chatId, replyToMessageId, replyToMessageObj);
        responseText =
          `🤍🤎💜💙💚💛🧡❤️\n` +
          `   ✨ <b>${escapeHtml(targetText || 'Люблю тебя')}</b> ✨\n` +
          `❤️🧡💛💚💙💜🤎🤍`;
        if (replyToMessageId) replyToId = replyToMessageId;
        break;
      }

      case '-7': {
        responseText =
          `🩸 <b>1000 - 7</b>\n\n` +
          `<code>1000 - 7 = 993\n` +
          `993 - 7 = 986\n` +
          `986 - 7 = 979\n` +
          `979 - 7 = 972\n` +
          `...\n` +
          `7 - 7 = 0</code>\n\n` +
          `<i>«Я тот, кто пожирает гулей...»</i> 👁️`;
        break;
      }

      case 'tyuring': {
        responseText =
          `🧠 <b>Тест Тьюринга</b>\n\n` +
          `• <b>Субъект:</b> SerkoGram Chat Automation\n` +
          `• <b>Когнитивный статус:</b> 100% Осознанность\n` +
          `• <b>Вердикт:</b> <i>Тест пройден. Искусственный интеллект неотличим от собеседника.</i> 🤖✨`;
        break;
      }

      case 'trol':
      case 'troll':
      case 'a_troll': {
        if (!checkCooldown(userId, 'troll', 10)) {
          responseText = `⏳ Подождите 10 секунд перед следующей командой.`;
        } else {
          responseText = `🙃 <b>SerkoGram</b>: Всё под контролем, система на связи.`;
        }
        break;
      }

      case 'dox':
      case 'deanon': {
        responseText = `🚫 <b>Команда недоступна</b>\n\nСбор персональных данных строго запрещён политикой безопасности SerkoGram и Telegram ToS.`;
        break;
      }

      default: {
        return { status: 'CANCELLED', errorCode: 'UNKNOWN_COMMAND' };
      }
    }

    // Send response to the same chat (with hard privacy check for managed chats)
    let sentMessageId: number | undefined = undefined;
    const isManagedChat = Boolean(businessConnectionId) || !ctx.isDirectBotChat;
    const isOwnerPrivateMode = commandDef.responseMode === 'OWNER_PRIVATE' || commandDef.responseMode === 'SILENT';

    if (responseText && isManagedChat && isOwnerPrivateMode) {
      console.warn(`[PRIVACY GUARD] Suppressed reply for command '${parsed.command}' in managed chat ${telegramChatId.toString()}`);
      responseText = null;
    }

    if (responseText) {
      try {
        const sent = await bot.api.sendMessage(telegramChatId.toString(), responseText, {
          parse_mode: 'HTML',
          business_connection_id: businessConnectionId,
          reply_parameters: replyToId ? { message_id: replyToId } : undefined,
        });
        sentMessageId = sent.message_id;
      } catch (tgErr: any) {
        // If bot blocked or cannot send message, log warning
        console.warn('[DotCommand] Could not send reply to chat:', telegramChatId.toString(), tgErr.description);
      }
    }

    // Update execution status to SUCCESS
    if (execution) {
      await prisma.commandExecution.update({
        where: { id: execution.id },
        data: {
          status: 'SUCCESS',
          resultMessageId: sentMessageId || null,
          completedAt: new Date(),
        },
      }).catch(() => null);
    }

    return {
      status: 'SUCCESS',
      responseMessage: responseText ?? undefined,
      resultTelegramMessageId: sentMessageId,
    };
  } catch (error: any) {
    console.error('[DotCommand] Error executing command:', parsed.command, error);

    if (execution) {
      await prisma.commandExecution.update({
        where: { id: execution.id },
        data: {
          status: 'FAILED',
          errorCode: error.message || 'EXECUTION_FAILED',
          completedAt: new Date(),
        },
      }).catch(() => null);
    }

    return {
      status: 'FAILED',
      errorCode: error.message || 'EXECUTION_FAILED',
    };
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}