// ============================================================
// SerkoGram — Dot Command Executor & Execution Storage
// ============================================================

import { prisma } from '@/lib/db';
import { getBot } from '@/lib/telegram/bot';
import { getCommandByName, isAiProviderConfigured } from './registry';
import { resolveReplyContext } from './reply-context';
import { saveEphemeralMedia } from '@/lib/services/ephemeral-service';
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
  } = ctx;

  // 1. Check self-trigger protection
  const botId = Number(process.env.TELEGRAM_BOT_TOKEN?.split(':')[0] || '0');
  if (botId > 0 && callerTelegramId === BigInt(botId)) {
    return { status: 'CANCELLED', errorCode: 'SELF_TRIGGER_PREVENTED' };
  }

  // 2. Command definition lookup
  const commandDef = getCommandByName(parsed.command, '.');
  if (!commandDef) {
    return { status: 'CANCELLED', errorCode: 'UNKNOWN_COMMAND' };
  }

  // 3. Check authorization: only connection owner may run dot commands in chat
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

  const bot = getBot();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  let responseText: string | null = null;
  let replyToId: number | undefined = undefined;

  try {
    switch (parsed.command) {
      case 'help': {
        responseText =
          `📋 <b>Команды SerkoGram (.)</b>\n\n` +
          `• <code>.info</code> — инфо о собеседнике / сервисе\n` +
          `• <code>.coin</code> — бросить монетку\n` +
          `• <code>.ttt</code> — крестики-нолики\n` +
          `• <code>.rps</code> — камень-ножницы-бумага\n` +
          `• <code>.save</code> — сохранить медиа/одноразовое фото\n` +
          `• <code>.гс</code> — аудиозаметки и голосовые\n` +
          `• <code>.перевод [код|off]</code> — автоперевод чата\n` +
          `• <code>.archive</code> — открыть архив этого чата\n` +
          `• <code>.deleted</code> — удалённые сообщения\n` +
          `• <code>.media</code> — медиатека этого чата\n` +
          `• <code>.search &lt;текст&gt;</code> — поиск по чату`;
        break;
      }

      case 'info': {
        if (replyToMessageId) {
          const replyCtx = await resolveReplyContext(chatId, replyToMessageId);
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
            `• <b>Контекст</b>: Текущий диалог защищён архивом SerkoGram.`;
        }
        break;
      }

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
          `Используйте кнопки Telegram для ходов.`;
        break;
      }

      case 'gpt':
      case 'a_gpt':
      case 'a_gpt_off':
      case 'image': {
        if (!isAiProviderConfigured()) {
          responseText =
            `🤖 <b>Нейросеть SerkoGram</b>\n\n` +
            `AI-функция пока не настроена (требуется подключение OPENAI_API_KEY).\n` +
            `Команда временно отключена.`;
        } else {
          responseText = `🤖 Запрос принят в обработку: <i>${escapeHtml(parsed.rawArguments || 'без параметров')}</i>`;
        }
        break;
      }

      case 'перевод': {
        const lang = parsed.arguments[0]?.toLowerCase();
        if (!lang) {
          responseText = `🌐 <b>Перевод сообщений</b>\nУкажите язык: <code>.перевод en</code> или <code>.перевод off</code> для отключения.`;
        } else if (lang === 'off') {
          responseText = `🌐 Автоматический перевод сообщений в этом чате <b>отключён</b>.`;
        } else {
          responseText = `🌐 Автоматический перевод сообщений в этом чате переключён на: <b>${escapeHtml(lang)}</b>.`;
        }
        break;
      }

      case 'save': {
        if (!replyToMessageId) {
          responseText = `ℹ️ Команда <code>.save</code> используется <b>в ответ</b> на сообщение или медиафайл (включая одноразовые фото/видео).`;
        } else {
          const res = await saveEphemeralMedia(chatId, replyToMessageId, userId);
          responseText = res.success
            ? `✅ <b>Медиафайл сохранён!</b>\n${escapeHtml(res.message)}`
            : `⚠️ ${escapeHtml(res.message)}`;
          replyToId = replyToMessageId;
        }
        break;
      }

      case 'гс': {
        if (!replyToMessageId) {
          responseText = `🎙 Команда <code>.гс</code> используется в ответ на голосовое сообщение или видеозаметку.`;
        } else {
          responseText = `🎙 Голосовое сообщение зафиксировано в архиве и отправлено на обработку аудиодорожки.`;
          replyToId = replyToMessageId;
        }
        break;
      }

      case 'archive': {
        responseText = appUrl
          ? `📁 <b>Архив текущего чата</b>:\n${appUrl}/archive/${chatId}`
          : `📁 Архив текущего чата сохранён в SerkoGram.`;
        break;
      }

      case 'deleted': {
        responseText = appUrl
          ? `🗑 <b>Удалённые сообщения этого чата</b>:\n${appUrl}/archive/${chatId}?filter=deleted`
          : `🗑 Раздел удалённых сообщений доступен в SerkoGram.`;
        break;
      }

      case 'media': {
        responseText = appUrl
          ? `📷 <b>Медиатека этого чата</b>:\n${appUrl}/archive/${chatId}?filter=media`
          : `📷 Медиатека доступна в SerkoGram.`;
        break;
      }

      case 'search': {
        const q = parsed.rawArguments;
        if (!q) {
          responseText = `🔍 Укажите поисковый запрос: <code>.search договор</code>`;
        } else {
          const encoded = encodeURIComponent(q);
          responseText = appUrl
            ? `🔍 Поиск по чату «<b>${escapeHtml(q)}</b>»:\n${appUrl}/archive/${chatId}?search=true&q=${encoded}`
            : `🔍 Поиск по чату запущен: ${escapeHtml(q)}`;
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

      case 'troll':
      case 'a_troll': {
        if (!checkCooldown(userId, 'troll', 10)) {
          responseText = `⏳ Подождите 10 секунд перед следующей командой.`;
        } else {
          responseText = `🙃 <b>SerkoGram</b>: Всё под контролем, переписка надёжно архивируется.`;
        }
        break;
      }

      default: {
        return { status: 'CANCELLED', errorCode: 'UNKNOWN_COMMAND' };
      }
    }

    // Send response to the same chat
    let sentMessageId: number | undefined = undefined;
    if (responseText) {
      try {
        const sent = await bot.api.sendMessage(Number(telegramChatId), responseText, {
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
      responseMessage: responseText,
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