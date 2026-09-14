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
import type { MessageType } from '@prisma/client';

// Grammy types
import type { Update, Message as TgMessage } from 'grammy/types';

/**
 * Process a Telegram update.
 * Handles: business_connection, business_message, edited_business_message,
 * deleted_business_messages, and bot commands.
 */
export async function processUpdate(update: Update): Promise<void> {
  // Idempotency check
  const exists = await prisma.processedUpdate.findUnique({
    where: { updateId: update.update_id },
  });
  if (exists) return;

  try {
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

    // Mark update as processed
    await prisma.processedUpdate.create({
      data: { updateId: update.update_id },
    });
  } catch (error) {
    console.error('[Webhook] Error processing update:', update.update_id, error);
    // Still mark as processed to avoid infinite retries
    await prisma.processedUpdate.create({
      data: { updateId: update.update_id },
    }).catch(() => {});
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

    await logAudit('CONNECTION_CREATED', user.id, {
      connectionId: bc.id,
      type: 'BUSINESS',
    });
  } else {
    // Disconnect
    await prisma.businessConnection.updateMany({
      where: { telegramConnectionId: bc.id },
      data: {
        status: 'DISCONNECTED',
        isEnabled: false,
        disconnectedAt: new Date(),
      },
    });

    await logAudit('CONNECTION_DELETED', user.id, {
      connectionId: bc.id,
    });
  }
}

// ============================================================
// Business Message Handler
// ============================================================

async function handleBusinessMessage(
  msg: TgMessage,
  _isEdit: boolean
): Promise<void> {
  if (!msg.business_connection_id) return;

  // Find the connection
  const connection = await prisma.businessConnection.findUnique({
    where: { telegramConnectionId: msg.business_connection_id },
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

  // Determine if outgoing (sent by the business user)
  const isOutgoing = msg.from?.id === Number(connection.userId) || msg.is_from_offline === true;

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
    forwardFromName: (msg as any).forward_origin?.sender_user_name ?? (msg as any).forward_sender_name,
    telegramDate: new Date(msg.date * 1000),
    rawData: JSON.parse(JSON.stringify(msg)),
  });

  // Download and store media if applicable
  if (settings?.saveMedia !== false) {
    await processMediaFromMessage(msg, saved.id);
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
// Bot Direct Message Handler (commands)
// ============================================================

async function handleBotMessage(msg: TgMessage): Promise<void> {
  if (!msg.text || !msg.from) return;

  const bot = getBot();
  const text = msg.text.trim();
  const chatId = msg.chat.id;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';

  if (text === '/start' || text.startsWith('/start ')) {
    await bot.api.sendMessage(chatId, [
      '🟣 *SerkoGram*',
      '',
      'Добро пожаловать\\!',
      '',
      'SerkoGram помогает сохранять и организовывать историю сообщений подключённого Telegram\\-аккаунта\\.',
      '',
      '• Автоматическое сохранение сообщений',
      '• Архив удалённых и изменённых сообщений',
      '• Поиск по истории',
      '• Хранение медиафайлов',
    ].join('\n'), {
      parse_mode: 'MarkdownV2',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📱 Открыть SerkoGram', web_app: { url: appUrl } }],
          [{ text: '🔗 Подключить Telegram', callback_data: 'connect' }],
          [{ text: '📖 Инструкция', callback_data: 'instructions' }],
          [{ text: '❓ FAQ', callback_data: 'faq' }],
          [{ text: '💬 Поддержка', callback_data: 'support' }],
        ],
      },
    });
  } else if (text === '/help') {
    await bot.api.sendMessage(chatId, [
      '📋 *Команды SerkoGram*',
      '',
      '/start — Главное меню',
      '/help — Список команд',
      '/info — О SerkoGram',
      '/archive — Открыть архив',
      '/deleted — Удалённые сообщения',
      '/media — Медиафайлы',
      '/search — Поиск',
      '/settings — Настройки',
    ].join('\n'), { parse_mode: 'Markdown' });
  } else if (text === '/info') {
    await bot.api.sendMessage(chatId, [
      '🟣 *SerkoGram*',
      '',
      'Персональный архив сообщений Telegram с отслеживанием удалённых и изменённых сообщений.',
      '',
      '• Подключение через Telegram Business',
      '• Сохранение всех типов сообщений',
      '• Отслеживание удалений и изменений',
      '• Безопасное хранение медиафайлов',
      '• Поиск по архиву',
    ].join('\n'), { parse_mode: 'Markdown' });
  } else if (['/archive', '/deleted', '/media', '/search', '/settings'].includes(text)) {
    const routes: Record<string, string> = {
      '/archive': '/archive',
      '/deleted': '/archive?filter=deleted',
      '/media': '/archive?filter=photo',
      '/search': '/archive?search=true',
      '/settings': '/settings',
    };
    const route = routes[text] ?? '/';
    await bot.api.sendMessage(chatId, '📱 Откройте SerkoGram для доступа к этому разделу:', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '📱 Открыть', web_app: { url: `${appUrl}${route}` } }],
        ],
      },
    });
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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';

  await bot.api.answerCallbackQuery(query.id);

  switch (query.data) {
    case 'connect':
      await bot.api.sendMessage(chatId, [
        '🔗 *Подключение Telegram Business*',
        '',
        '1\\. Откройте Telegram → Настройки',
        '2\\. Telegram Business → Чат\\-боты',
        '3\\. Выберите @' + (process.env.TELEGRAM_BOT_USERNAME ?? 'SerkoGramBot'),
        '4\\. Настройте разрешения',
        '',
        'После подключения SerkoGram начнёт сохранять сообщения автоматически\\.',
      ].join('\n'), { parse_mode: 'MarkdownV2' });
      break;

    case 'instructions':
      await bot.api.sendMessage(chatId, '📖 Откройте инструкцию в SerkoGram:', {
        reply_markup: {
          inline_keyboard: [
            [{ text: '📖 Инструкция', web_app: { url: `${appUrl}/instructions` } }],
          ],
        },
      });
      break;

    case 'faq':
      await bot.api.sendMessage(chatId, '❓ Откройте FAQ в SerkoGram:', {
        reply_markup: {
          inline_keyboard: [
            [{ text: '❓ FAQ', web_app: { url: `${appUrl}/faq` } }],
          ],
        },
      });
      break;

    case 'support':
      await bot.api.sendMessage(chatId, '💬 Откройте поддержку в SerkoGram:', {
        reply_markup: {
          inline_keyboard: [
            [{ text: '💬 Поддержка', web_app: { url: `${appUrl}/support` } }],
          ],
        },
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
    if (msg.photo && msg.photo.length > 0) {
      const largest = msg.photo[msg.photo.length - 1];
      await downloadAndStoreMedia(messageId, largest.file_id, largest.file_unique_id, 'photo', {
        width: largest.width,
        height: largest.height,
        fileSize: largest.file_size,
        mimeType: 'image/jpeg',
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
