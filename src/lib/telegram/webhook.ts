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
import { downloadAndStoreMedia } from '@/lib/services/media-service';
import { logAudit } from '@/lib/services/audit-service';
import { parseBotCommand } from './parser';
import { executeCommand } from './handlers';
import { parseAnyCommand } from '@/lib/commands/parser';
import { executeDotCommand } from '@/lib/commands/executor';
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

  // Find the business connection WITH owner user details
  const connection = await prisma.businessConnection.findUnique({
    where: { telegramConnectionId: msg.business_connection_id },
    include: { user: true },
  });
  if (!connection || connection.status !== 'ACTIVE') return;

  // Check user settings
  const settings = await prisma.userSettings.findUnique({
    where: { userId: connection.userId },
  });
  if (settings && !settings.saveMessages) return;

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

  // RELIABLE OUTGOING DETECTION:
  // 1. is_from_offline is true when business owner sent it from an official client
  // 2. In private chats, if sender is not the chat partner, it was sent by business owner
  // 3. Sender ID matches the business connection owner's Telegram ID
  const isOutgoing =
    msg.is_from_offline === true ||
    (msg.chat.type === 'private' && msg.from ? msg.from.id !== msg.chat.id : false) ||
    (msg.from && connection.user?.telegramId
      ? BigInt(msg.from.id) === connection.user.telegramId
      : false);

  // Save message
  const saved = await saveMessage({
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
  if (!settings || settings.saveMedia) {
    await processMediaFromMessage(msg, saved.id);
  }

  // Handle dot commands in business chat (e.g. .help, .info, .save, .coin, .search, etc.)
  if (msg.text && msg.text.trim().startsWith('.')) {
    try {
      const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'SerkoGram_bot';
      const parsedDot = parseAnyCommand(msg.text, {
        allowedPrefixes: ['.'],
        currentBotUsername: botUsername,
        chatId: chat.id,
        senderId: msg.from?.id,
        replyToMessageId: msg.reply_to_message?.message_id,
      });

      if (parsedDot.isCommand) {
        await executeDotCommand({
          parsed: parsedDot,
          chatId: chat.id,
          telegramChatId: BigInt(msg.chat.id),
          businessConnectionId: msg.business_connection_id,
          userId: connection.userId,
          callerTelegramId: msg.from ? BigInt(msg.from.id) : BigInt(0),
          isOwner: isOutgoing,
          messageId: msg.message_id,
          replyToMessageId: msg.reply_to_message?.message_id,
        });
      }
    } catch (cmdErr) {
      console.error('[Webhook] Error executing dot command:', cmdErr);
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