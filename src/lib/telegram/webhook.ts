// ============================================================
// SerkoGram — Telegram Webhook Handler
// Processes all Telegram updates for business connections
// ============================================================

import { prisma } from '@/lib/db';
import { getBot } from './bot';
import {
  saveMessage,
  processEditedMessage,
  processDeletedMessages,
} from '@/lib/services/message-service';
import { getRealTelegramBusinessConnection, chatAutomation } from '@/lib/services/connection-service';
import { downloadAndStoreMedia } from '@/lib/services/media-service';
import { logAudit } from '@/lib/services/audit-service';
import { parseBotCommand } from './parser';
import { executeCommand } from './handlers';
import { parseAnyCommand } from '@/lib/commands/parser';
import { resolveCommandContext } from '@/lib/commands/context';
import { executeDotCommand } from '@/lib/commands/executor';
import { jobService } from '@/lib/services/job-service';
import { detectEphemeralAttributes } from '@/lib/services/ephemeral-service';
import { renderTttKeyboard, handleTttStep, handleRpsGame } from './games';
import type { MessageType } from '@prisma/client';

// Grammy types
import type { Update, Message as TgMessage } from 'grammy/types';

/**
 * Process a Telegram update.
 * Handles: business_connection, business_message, edited_business_message,
 * deleted_business_messages, and bot commands.
 *
 * NOTE: If processing fails, this function THROWS so the HTTP handler
 * returns 500 and Telegram retries the update.
 * ProcessedUpdate is created ONLY upon successful processing.
 */
export async function processUpdate(update: Update): Promise<void> {
  const hasDb = Boolean(process.env.DATABASE_URL);

  // Idempotency check: if already processed, return immediately
  if (hasDb) {
    try {
      const exists = await prisma.processedUpdate.findUnique({
        where: { updateId: update.update_id },
      });
      if (exists) return;
    } catch (err) {
      console.warn('[Webhook] DB lookup warning:', err);
    }
  }

  // Process update handlers
  if (update.business_connection) {
    await handleBusinessConnection(update);
  } else if (update.business_message) {
    await handleBusinessMessage(update.business_message, false);
  } else if (update.edited_business_message) {
    await handleEditedBusinessMessage(update.edited_business_message);
  } else if (update.deleted_business_messages) {
    await handleDeletedBusinessMessages(update);
  } else if (update.message) {
    await handleBotMessage(update.message);
  } else if (update.callback_query) {
    await handleCallbackQuery(update);
  }

  // Trigger sweep of any due durable scheduled jobs across serverless invocations
  jobService.processDueJobs().catch((jobErr) => {
    console.warn('[Webhook] Background job sweep note:', jobErr);
  });

  // Mark update as processed ONLY after successful completion
  if (hasDb) {
    try {
      await prisma.processedUpdate.create({
        data: { updateId: update.update_id },
      });
    } catch (err) {
      console.warn('[Webhook] Failed to mark update as processed:', err);
    }
  }
}

// ============================================================
// Business Connection Handler
// ============================================================

async function handleBusinessConnection(update: Update): Promise<void> {
  const bc = update.business_connection!;

  // Find or create user
  const user = await prisma.user.upsert({
    where: { telegramId: BigInt(bc.user.id) },
    create: {
      telegramId: BigInt(bc.user.id),
      firstName: bc.user.first_name,
      lastName: bc.user.last_name ?? null,
      username: bc.user.username ?? null,
      isPremium: bc.user.is_premium ?? false,
    },
    update: {
      firstName: bc.user.first_name,
      lastName: bc.user.last_name ?? null,
      username: bc.user.username ?? null,
    },
  });

  const canReply = Boolean((bc as any).can_reply ?? (bc as any).rights?.can_reply ?? false);

  if (bc.is_enabled) {
    // Connect or reconnect
    await prisma.businessConnection.upsert({
      where: { telegramConnectionId: bc.id },
      create: {
        userId: user.id,
        telegramConnectionId: bc.id,
        type: 'BUSINESS',
        status: 'ACTIVE',
        canReply,
        isEnabled: true,
        connectedAt: new Date(bc.date * 1000),
      },
      update: {
        status: 'ACTIVE',
        canReply,
        isEnabled: true,
        disconnectedAt: null,
      },
    });

    // Ensure default settings exist
    await prisma.userSettings.upsert({
      where: { userId: user.id },
      create: { userId: user.id },
      update: {},
    });

    await prisma.privacySettings.upsert({
      where: { userId: user.id },
      create: { userId: user.id },
      update: {},
    });

    await logAudit('CONNECTION_CREATED', user.id, {
      canReply,
      date: bc.date,
      telegramConnectionId: bc.id,
    });
  } else {
    // Disconnect
    await prisma.businessConnection.updateMany({
      where: { telegramConnectionId: bc.id },
      data: {
        status: 'DISCONNECTED',
        isEnabled: false,
        disconnectedAt: new Date(bc.date * 1000),
      },
    });

    await logAudit('CONNECTION_DELETED', user.id, {
      date: bc.date,
      telegramConnectionId: bc.id,
    });
  }
}

// ============================================================
// Business Message Handler (Save / Ingest)
// ============================================================

async function handleBusinessMessage(msg: TgMessage, isEdited: boolean): Promise<void> {
  if (!msg.business_connection_id) return;

  const botId = Number(process.env.TELEGRAM_BOT_TOKEN?.split(':')[0] || '0');
  if (botId > 0 && ((msg.from && msg.from.id === botId) || (msg as any).via_bot?.id === botId)) {
    return;
  }

  // Authoritative real connection lookup
  const realBc = await getRealTelegramBusinessConnection(msg.business_connection_id);

  // Find the business connection WITH owner user details
  let connection = await prisma.businessConnection.findUnique({
    where: { telegramConnectionId: msg.business_connection_id },
    include: { user: true },
  });

  // If local DB is missing connection record but Telegram confirms it is active, auto-upsert
  if (!connection && realBc && realBc.is_enabled) {
    const user = await prisma.user.upsert({
      where: { telegramId: BigInt(realBc.user.id) },
      create: {
        telegramId: BigInt(realBc.user.id),
        firstName: realBc.user.first_name,
        lastName: realBc.user.last_name ?? null,
        username: realBc.user.username ?? null,
        isPremium: realBc.user.is_premium ?? false,
      },
      update: {
        firstName: realBc.user.first_name,
        lastName: realBc.user.last_name ?? null,
        username: realBc.user.username ?? null,
      },
    });

    connection = await prisma.businessConnection.upsert({
      where: { telegramConnectionId: msg.business_connection_id },
      create: {
        userId: user.id,
        telegramConnectionId: msg.business_connection_id,
        type: 'BUSINESS',
        status: 'ACTIVE',
        canReply: Boolean(realBc.can_reply),
        isEnabled: Boolean(realBc.is_enabled),
        connectedAt: new Date(realBc.date * 1000),
      },
      update: {
        status: 'ACTIVE',
        canReply: Boolean(realBc.can_reply),
        isEnabled: Boolean(realBc.is_enabled),
      },
      include: { user: true },
    });
  }

  if (!connection || connection.status !== 'ACTIVE') return;

  // Check user settings
  const settings = await prisma.userSettings.findUnique({
    where: { userId: connection.userId },
  });

  // Find or create chat
  const chat = await prisma.chat.upsert({
    where: {
      telegramChatId_connectionId: {
        telegramChatId: BigInt(msg.chat.id),
        connectionId: connection.id,
      },
    },
    create: {
      telegramChatId: BigInt(msg.chat.id),
      connectionId: connection.id,
      title: msg.chat.title ?? msg.chat.first_name ?? `Chat ${msg.chat.id}`,
      chatType: msg.chat.type,
    },
    update: {
      title: msg.chat.title ?? msg.chat.first_name ?? undefined,
    },
  });

  // Ensure sender is tracked as chat member
  if (msg.from) {
    await prisma.chatMember.upsert({
      where: {
        chatId_telegramUserId: {
          chatId: chat.id,
          telegramUserId: BigInt(msg.from.id),
        },
      },
      create: {
        chatId: chat.id,
        telegramUserId: BigInt(msg.from.id),
        firstName: msg.from.first_name,
        lastName: msg.from.last_name ?? null,
        username: msg.from.username ?? null,
      },
      update: {
        firstName: msg.from.first_name,
        lastName: msg.from.last_name ?? null,
        username: msg.from.username ?? null,
      },
    });
  }

  // Determine message type
  const messageType = detectMessageType(msg);

  // Authoritative command & message context resolution
  const cmdContext = resolveCommandContext({
    msg,
    chatId: chat.id,
    telegramChatId: BigInt(msg.chat.id),
    connection,
    realBc,
    isDirectBotChat: false,
  });

  const isOutgoing = cmdContext.isOwnerMessage;
  const ownerTelegramId = cmdContext.telegramOwnerId;

  // Save message to archive if user settings allow
  let saved: any = null;
  if (!settings || settings.saveMessages) {
    saved = await saveMessage({
      chatId: chat.id,
      telegramMessageId: msg.message_id,
      businessConnectionId: msg.business_connection_id,
      senderTelegramId: msg.from ? BigInt(msg.from.id) : undefined,
      senderName: msg.from
        ? [msg.from.first_name, msg.from.last_name].filter(Boolean).join(' ')
        : undefined,
      senderUsername: msg.from?.username,
      isOutgoing,
      messageType,
      text: msg.text,
      caption: msg.caption,
      replyToMessageId: msg.reply_to_message?.message_id,
      telegramDate: new Date(msg.date * 1000),
    });

    // Process media asynchronously if user settings allow
    if (saved && (!settings || settings.saveMedia)) {
      await processMediaFromMessage(msg, saved.id);
    }
  }

  // ============================================================
  // MUTE / PANIC ENFORCEMENT — auto-delete incoming if active
  // ============================================================
  if (cmdContext.isIncomingMessage && msg.business_connection_id) {
    try {
      const automationSettings = await chatAutomation.getChatSettings(chat.id);

      // PANIC MODE: delete ALL incoming messages from interlocutor
      if (automationSettings.panicEnabled) {
        const bot = getBot();
        try {
          await bot.api.deleteMessage(msg.chat.id, msg.message_id);
        } catch (delErr: any) {
          console.warn('[ChatAutomation] Panic delete failed:', delErr?.description);
        }
        return; // Stop all further processing
      }

      // MUTE MODE: delete incoming if mute is active and not expired
      if (automationSettings.muteEnabled) {
        const muteExpired = automationSettings.muteUntil && new Date(automationSettings.muteUntil) < new Date();
        if (muteExpired) {
          // Mute expired, disable it
          await chatAutomation.setChatSettings(chat.id, { muteEnabled: false, muteUntil: null });
        } else {
          const bot = getBot();
          try {
            await bot.api.deleteMessage(msg.chat.id, msg.message_id);
          } catch (delErr: any) {
            console.warn('[ChatAutomation] Mute delete failed:', delErr?.description);
          }
          return; // Stop further processing for muted messages
        }
      }
    } catch (autoErr) {
      console.warn('[ChatAutomation] Settings check error:', autoErr);
    }
  }

  // Handle dot and slash commands in business chat (supporting both text and caption)
  if (cmdContext.isCommand) {
    try {
      await executeDotCommand(cmdContext);
    } catch (cmdErr) {
      console.error('[Webhook] Error executing dot command:', cmdErr);
    }
  } else if (cmdContext.isIncomingMessage && cmdContext.effectiveText) {
    // Auto-translation for incoming messages in managed chat if enabled
    const settings2 = await chatAutomation.getChatSettings(chat.id);
    const autoLang = settings2.autoTranslateLang;
    if (autoLang && autoLang !== 'off') {
      try {
        const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(cmdContext.effectiveText)}&langpair=auto|${autoLang}`);
        const data = await res.json();
        const translated = data?.responseData?.translatedText;
        if (translated && translated.trim().toLowerCase() !== cmdContext.effectiveText.trim().toLowerCase()) {
          const bot = getBot();
          await bot.api.sendMessage(msg.chat.id.toString(), `🌐 <b>Перевод:</b> <i>${translated}</i>`, {
            parse_mode: 'HTML',
            business_connection_id: msg.business_connection_id,
            reply_parameters: { message_id: msg.message_id },
          });
        }
      } catch (trErr) {
        console.warn('[ChatAutomation] Auto-translate note:', trErr);
      }
    }
  }
}

// ============================================================
// Edited Business Message Handler
// ============================================================

async function handleEditedBusinessMessage(msg: TgMessage): Promise<void> {
  if (!msg.business_connection_id) return;

  const connection = await prisma.businessConnection.findUnique({
    where: { telegramConnectionId: msg.business_connection_id },
  });
  if (!connection || connection.status !== 'ACTIVE') return;

  const settings = await prisma.userSettings.findUnique({
    where: { userId: connection.userId },
  });
  if (settings && !settings.saveEdits) return;

  const chat = await prisma.chat.findFirst({
    where: {
      telegramChatId: BigInt(msg.chat.id),
      connectionId: connection.id,
    },
  });
  if (!chat) return;

  await processEditedMessage({
    chatId: chat.id,
    telegramMessageId: msg.message_id,
    newText: msg.text,
    newCaption: msg.caption,
    editedAt: new Date((msg.edit_date ?? msg.date) * 1000),
  });
}

// ============================================================
// Deleted Business Messages Handler
// ============================================================

async function handleDeletedBusinessMessages(update: Update): Promise<void> {
  const del = update.deleted_business_messages!;

  const connection = await prisma.businessConnection.findUnique({
    where: { telegramConnectionId: del.business_connection_id },
  });
  if (!connection || connection.status !== 'ACTIVE') return;

  const settings = await prisma.userSettings.findUnique({
    where: { userId: connection.userId },
  });
  if (settings && !settings.saveDeleted) return;

  const chat = await prisma.chat.findFirst({
    where: {
      telegramChatId: BigInt(del.chat.id),
      connectionId: connection.id,
    },
  });
  if (!chat) return;

  await processDeletedMessages(chat.id, del.message_ids, new Date());
}

// ============================================================
// Bot Direct Message Handler (Commands via parser & handlers)
// ============================================================

async function handleBotMessage(msg: TgMessage): Promise<void> {
  if (!msg.text) return;

  const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'SerkoGram_bot';
  const parsed = parseAnyCommand(msg.text, {
    allowedPrefixes: ['.', '/'],
    currentBotUsername: botUsername,
    chatId: msg.chat.id,
    senderId: msg.from?.id,
    replyToMessageId: msg.reply_to_message?.message_id,
  });

  if (parsed.isCommand) {
    await executeCommand(msg, parsed as any);
  } else if (msg.chat.type === 'private') {
    const bot = getBot();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    await bot.api
      .sendMessage(
        msg.chat.id,
        `👋 <b>SerkoGram на связи!</b>\n\n` +
          `Используйте команды меню (например <code>/start</code> или <code>/help</code>), или откройте Mini App:`,
        {
          parse_mode: 'HTML',
          reply_markup: appUrl
            ? {
                inline_keyboard: [
                  [{ text: '📱 Открыть SerkoGram', web_app: { url: appUrl } }],
                  [{ text: '📋 Каталог команд', callback_data: 'commands' }],
                  [{ text: '❓ FAQ', callback_data: 'faq' }],
                ],
              }
            : undefined,
        }
      )
      .catch(() => null);
  }
}

// ============================================================
// Callback Query Handler
// ============================================================

async function handleCallbackQuery(update: Update): Promise<void> {
  const query = update.callback_query!;
  if (!query.data || !query.message) return;

  const bot = getBot();
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';

  await bot.api.answerCallbackQuery(query.id).catch(() => null);

  // Tic-Tac-Toe handling
  if (query.data === 'ttt:noop') {
    return;
  }

  if (query.data === 'ttt:reset') {
    await bot.api
      .editMessageText(
        chatId,
        messageId,
        `❌⭕ <b>Крестики-нолики</b>\n\nВыберите клетку для вашего первого хода (❌):`,
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: renderTttKeyboard('---------', false),
          },
        }
      )
      .catch(() => null);
    return;
  }

  if (query.data.startsWith('ttt:play:')) {
    const parts = query.data.split(':');
    const boardStr = parts[2] || '---------';
    const moveIndex = Number(parts[3] ?? -1);

    const step = handleTttStep(boardStr, moveIndex);
    await bot.api
      .editMessageText(chatId, messageId, step.text, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: step.keyboard,
        },
      })
      .catch(() => null);
    return;
  }

  // Rock-Paper-Scissors handling
  if (query.data === 'rps:reset') {
    await bot.api
      .editMessageText(
        chatId,
        messageId,
        `🎮 <b>Камень, ножницы, бумага</b>\nСделайте ваш ход:`,
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '🪨 Камень', callback_data: 'rps:play:камень' },
                { text: '✂️ Ножницы', callback_data: 'rps:play:ножницы' },
                { text: '📄 Бумага', callback_data: 'rps:play:бумага' },
              ],
            ],
          },
        }
      )
      .catch(() => null);
    return;
  }

  if (query.data.startsWith('rps:play:') || query.data.startsWith('rps:')) {
    const choice = query.data.startsWith('rps:play:')
      ? query.data.split(':')[2]
      : query.data.split(':')[1];

    const res = handleRpsGame(choice);
    await bot.api
      .editMessageText(chatId, messageId, res.text, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: res.keyboard,
        },
      })
      .catch(async () => {
        await bot.api
          .sendMessage(chatId, res.text, {
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: res.keyboard },
          })
          .catch(() => null);
      });
    return;
  }

  // ------------------------------------------------------------
  // Interactive Moderation & Automation Callbacks
  // Security check: only authoritative owner of the connection/chat can trigger!
  // Format: action:subAction:targetChatId:ownerTelegramId
  // ------------------------------------------------------------
  if (
    query.data.startsWith('mute:') ||
    query.data.startsWith('panic:') ||
    query.data.startsWith('tr:') ||
    query.data.startsWith('agpt:')
  ) {
    const parts = query.data.split(':');
    const action = parts[0];
    const subAction = parts[1];
    const targetChatId = parts[2];
    const expectedOwnerId = parts[3];
    const callerTelegramId = query.from?.id ? query.from.id.toString() : '';

    // Hard Security Guard: Verify caller is owner
    if (expectedOwnerId && callerTelegramId && expectedOwnerId !== callerTelegramId) {
      await bot.api.answerCallbackQuery(query.id, {
        text: '⛔ Только владелец чата может управлять этим режимом.',
        show_alert: true,
      }).catch(() => null);
      return;
    }

    if (action === 'mute') {
      if (subAction === 'unmute') {
        await chatAutomation.setChatSettings(targetChatId, {
          muteEnabled: false,
          muteUntil: null,
        });

        await bot.api.editMessageText(
          chatId,
          messageId,
          `🔊 <b>Ограничение диалога отключено</b>\n\nВходящие сообщения собеседника больше не удаляются.`,
          {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '🔇 Включить мут (15 мин)', callback_data: `mute:mute:${targetChatId}:${expectedOwnerId}` },
                  ...(appUrl ? [{ text: '⚙ Настройки', web_app: { url: `${appUrl}/settings` } }] : []),
                ],
              ],
            },
          }
        ).catch(() => null);

        await bot.api.answerCallbackQuery(query.id, {
          text: '🔊 Мут отключён',
        }).catch(() => null);
        return;
      }

      if (subAction === 'mute') {
        const muteUntil = new Date(Date.now() + 15 * 60 * 1000);
        await chatAutomation.setChatSettings(targetChatId, {
          muteEnabled: true,
          muteUntil,
        });

        await bot.api.editMessageText(
          chatId,
          messageId,
          `🔇 <b>Режим Mute активирован (15 мин)</b>\n\nВходящие сообщения собеседника удаляются автоматически.`,
          {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '🔊 Размутить', callback_data: `mute:unmute:${targetChatId}:${expectedOwnerId}` },
                  ...(appUrl ? [{ text: '⚙ Настройки', web_app: { url: `${appUrl}/settings` } }] : []),
                ],
              ],
            },
          }
        ).catch(() => null);

        await bot.api.answerCallbackQuery(query.id, {
          text: '🔇 Мут включён на 15 минут',
        }).catch(() => null);
        return;
      }
    }

    if (action === 'panic') {
      if (subAction === 'enable') {
        await chatAutomation.setChatSettings(targetChatId, { panicEnabled: true });

        await bot.api.editMessageText(
          chatId,
          messageId,
          `🚨 <b>PANIC MODE АКТИВИРОВАН</b>\n\n• Фильтрация всех входящих сообщений включена.\n• Автоматические функции приостановлены.`,
          {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '🛑 Отключить Panic', callback_data: `panic:disable:${targetChatId}:${expectedOwnerId}` },
                ],
              ],
            },
          }
        ).catch(() => null);

        await bot.api.answerCallbackQuery(query.id, {
          text: '🚨 Panic mode активирован',
        }).catch(() => null);
        return;
      }

      if (subAction === 'disable' || subAction === 'cancel') {
        await chatAutomation.setChatSettings(targetChatId, { panicEnabled: false });

        await bot.api.editMessageText(
          chatId,
          messageId,
          `🛡 <b>Экстренный режим отключён</b>\n\nДиалог возвращён в нормальный режим.`,
          {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '🚨 Включить Panic', callback_data: `panic:enable:${targetChatId}:${expectedOwnerId}` },
                ],
              ],
            },
          }
        ).catch(() => null);

        await bot.api.answerCallbackQuery(query.id, {
          text: '🛡 Экстренный режим отключён',
        }).catch(() => null);
        return;
      }
    }

    if (action === 'tr' && subAction === 'off') {
      await chatAutomation.setChatSettings(targetChatId, { autoTranslateLang: null });

      await bot.api.editMessageText(
        chatId,
        messageId,
        `🌐 <b>Автоперевод отключён</b>\n\nПеревод входящих сообщений деактивирован.`,
        { parse_mode: 'HTML' }
      ).catch(() => null);

      await bot.api.answerCallbackQuery(query.id, {
        text: 'Перевод отключён',
      }).catch(() => null);
      return;
    }
  }

  switch (query.data) {
    case 'connect':
      await bot.api.sendMessage(
        chatId,
        `🔗 <b>Подключение Telegram Business</b>\n\n` +
          `1. Откройте Telegram → <b>Настройки</b>\n` +
          `2. <b>Telegram Business</b> → <b>Чат-боты</b>\n` +
          `3. Выберите @${process.env.TELEGRAM_BOT_USERNAME ?? 'SerkoGram_bot'}\n` +
          `4. Настройте разрешения и выберите чаты\n\n` +
          `После подключения SerkoGram начнёт автоматически сохранять переписку.`,
        { parse_mode: 'HTML' }
      );
      break;

    case 'commands':
      await bot.api.sendMessage(
        chatId,
        `📋 <b>Каталог команд SerkoGram</b>\n\n` +
          `Нажмите кнопку ниже, чтобы открыть полный каталог команд с примерами и фильтрами:`,
        {
          parse_mode: 'HTML',
          reply_markup: appUrl
            ? {
                inline_keyboard: [[{ text: '📱 Открыть каталог команд', web_app: { url: `${appUrl}/commands` } }]],
              }
            : undefined,
        }
      );
      break;

    case 'instructions':
      await bot.api.sendMessage(chatId, '📖 Откройте пошаговую инструкцию:', {
        reply_markup: appUrl
          ? {
              inline_keyboard: [[{ text: '📖 Инструкция', web_app: { url: `${appUrl}/instructions` } }]],
            }
          : undefined,
      });
      break;

    case 'faq':
      await bot.api.sendMessage(chatId, '❓ Ответы на частые вопросы:', {
        reply_markup: appUrl
          ? {
              inline_keyboard: [[{ text: '❓ FAQ', web_app: { url: `${appUrl}/faq` } }]],
            }
          : undefined,
      });
      break;

    case 'support':
      await bot.api.sendMessage(chatId, '💬 Служба поддержки SerkoGram:', {
        reply_markup: appUrl
          ? {
              inline_keyboard: [[{ text: '💬 Поддержка', web_app: { url: `${appUrl}/support` } }]],
            }
          : undefined,
      });
      break;
  }
}

// ============================================================
// Helpers
// ============================================================

function detectMessageType(msg: TgMessage): MessageType {
  if (msg.photo) return 'PHOTO';
  if (msg.video) return 'VIDEO';
  if (msg.document) return 'DOCUMENT';
  if (msg.audio) return 'AUDIO';
  if (msg.voice) return 'VOICE';
  if (msg.video_note) return 'VIDEO_NOTE';
  if (msg.sticker) return 'STICKER';
  if (msg.animation) return 'ANIMATION';
  if (msg.contact) return 'CONTACT';
  if (msg.location) return 'LOCATION';
  if (msg.venue) return 'VENUE';
  if (msg.poll) return 'POLL';
  if (msg.dice) return 'DICE';
  if (msg.text) return 'TEXT';
  return 'UNKNOWN';
}

async function processMediaFromMessage(msg: TgMessage, messageId: string): Promise<void> {
  try {
    const eph = detectEphemeralAttributes(msg);
    const ephMeta = {
      isEphemeral: eph.isEphemeral,
      isViewOnce: eph.isViewOnce,
      ttlSeconds: eph.ttlSeconds,
    };

    if (msg.photo && msg.photo.length > 0) {
      const largest = msg.photo[msg.photo.length - 1];
      await downloadAndStoreMedia(messageId, largest.file_id, largest.file_unique_id, 'photo', {
        width: largest.width,
        height: largest.height,
        fileSize: largest.file_size,
        mimeType: 'image/jpeg',
        ...ephMeta,
      });
    }

    if (msg.video) {
      await downloadAndStoreMedia(messageId, msg.video.file_id, msg.video.file_unique_id, 'video', {
        width: msg.video.width,
        height: msg.video.height,
        duration: msg.video.duration,
        fileSize: msg.video.file_size,
        mimeType: msg.video.mime_type,
        fileName: msg.video.file_name,
        ...ephMeta,
      });
    }

    if (msg.document) {
      await downloadAndStoreMedia(messageId, msg.document.file_id, msg.document.file_unique_id, 'document', {
        fileSize: msg.document.file_size,
        mimeType: msg.document.mime_type,
        fileName: msg.document.file_name,
      });
    }

    if (msg.audio) {
      await downloadAndStoreMedia(messageId, msg.audio.file_id, msg.audio.file_unique_id, 'audio', {
        duration: msg.audio.duration,
        fileSize: msg.audio.file_size,
        mimeType: msg.audio.mime_type,
        fileName: msg.audio.file_name,
      });
    }

    if (msg.voice) {
      await downloadAndStoreMedia(messageId, msg.voice.file_id, msg.voice.file_unique_id, 'voice', {
        duration: msg.voice.duration,
        fileSize: msg.voice.file_size,
        mimeType: msg.voice.mime_type,
      });
    }

    if (msg.video_note) {
      await downloadAndStoreMedia(messageId, msg.video_note.file_id, msg.video_note.file_unique_id, 'video_note', {
        duration: msg.video_note.duration,
        fileSize: msg.video_note.file_size,
      });
    }

    if (msg.sticker) {
      await downloadAndStoreMedia(messageId, msg.sticker.file_id, msg.sticker.file_unique_id, 'sticker', {
        width: msg.sticker.width,
        height: msg.sticker.height,
      });
    }

    if (msg.animation) {
      await downloadAndStoreMedia(messageId, msg.animation.file_id, msg.animation.file_unique_id, 'animation', {
        width: msg.animation.width,
        height: msg.animation.height,
        duration: msg.animation.duration,
        fileSize: msg.animation.file_size,
        mimeType: msg.animation.mime_type,
        fileName: msg.animation.file_name,
      });
    }
  } catch (error) {
    console.error('[Webhook] Error processing media:', error);
  }
}