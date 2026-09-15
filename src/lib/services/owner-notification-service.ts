// ============================================================
// SerkoGram — Private Owner Notification Service
// Ensures all archive confirmations, media saves, and failure
// events are delivered PRIVATELY to the owner only.
// NEVER leaks archive status or confirmations to the managed chat.
// ============================================================

import { prisma } from '@/lib/db';
import { getBot } from '@/lib/telegram/bot';
import type { NotificationType, NotificationStatus, OwnerNotification } from '@prisma/client';

export interface NotifyOwnerPayload {
  userId: string;
  telegramUserId: string | number | bigint;
  type: NotificationType;
  title: string;
  text: string;
  chatId?: string;
  chatTitle?: string;
  messageId?: number;
  mediaId?: string;
  mediaType?: string;
  isEphemeral?: boolean;
  destinationOverride?: string | number | bigint;
}

export interface OwnerNotificationResult {
  success: boolean;
  status: NotificationStatus;
  notificationId?: string;
  deliveredViaTelegram: boolean;
  error?: string;
}

const CRITICAL_PRIVATE_TYPES: NotificationType[] = [
  'ARCHIVE_SUCCESS',
  'MEDIA_SAVED',
  'EPHEMERAL_SAVED',
  'ARCHIVE_FAILURE',
];

/**
 * Hard security guard: asserts that an archive notification destination
 * matches the authoritative owner Telegram ID.
 * Throws an explicit error if a managed chat or non-owner destination is supplied.
 */
export function assertNotificationDestination(
  destinationTelegramId: string | number | bigint,
  ownerTelegramId: string | number | bigint,
  type: NotificationType
): void {
  const destStr = destinationTelegramId.toString();
  const ownerStr = ownerTelegramId.toString();

  if (CRITICAL_PRIVATE_TYPES.includes(type) && destStr !== ownerStr) {
    const errorMsg = `[SECURITY VIOLATION] Attempted to send private archive notification (${type}) to non-owner destination ${destStr} (expected owner: ${ownerStr}). BLOCKED.`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

class OwnerNotificationService {
  /**
   * Dispatches a private notification to the owner.
   * Priority:
   * 1. Persist notification in database (status: PENDING)
   * 2. Attempt direct private Telegram DM via @SerkoGram_bot to ownerTelegramId
   * 3. If direct DM succeeds: status = SENT
   * 4. If direct DM fails (bot blocked or /start not clicked): keep status PENDING for Mini App inbox
   */
  async notifyOwner(payload: NotifyOwnerPayload): Promise<OwnerNotificationResult> {
    const {
      userId,
      telegramUserId,
      type,
      title,
      text,
      chatId,
      chatTitle,
      messageId,
      mediaId,
      mediaType,
      isEphemeral,
      destinationOverride,
    } = payload;

    const targetDestination = destinationOverride ?? telegramUserId;

    // 1. Hard destination assertion
    assertNotificationDestination(targetDestination, telegramUserId, type);

    const ownerTgBigInt = BigInt(telegramUserId.toString());

    // 2. Persist in database
    let record: any = null;
    try {
      record = await prisma.ownerNotification.create({
        data: {
          userId,
          telegramUserId: ownerTgBigInt,
          type,
          title,
          text,
          chatId: chatId ?? null,
          chatTitle: chatTitle ?? null,
          messageId: messageId ?? null,
          mediaId: mediaId ?? null,
          mediaType: mediaType ?? null,
          isEphemeral: Boolean(isEphemeral),
          status: 'PENDING',
        },
      });
    } catch (dbErr: any) {
      console.warn('[OwnerNotification] Failed to create database record, continuing with direct notify:', dbErr?.message);
    }

    // 3. Attempt direct private message from @SerkoGram_bot to owner
    let delivered = false;
    let deliveryError: string | undefined = undefined;

    try {
      const bot = getBot();
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';

      let messageText = `<b>${escapeHtml(title)}</b>\n\n`;
      if (chatTitle) {
        messageText += `• <b>Чат:</b> ${escapeHtml(chatTitle)}\n`;
      }
      if (mediaType) {
        messageText += `• <b>Тип:</b> ${escapeHtml(mediaType)}${isEphemeral ? ' <i>(Одноразовое)</i>' : ''}\n`;
      }
      if (text) {
        messageText += `\n${text}\n`;
      }

      // Inline button to open Mini App archive if applicable
      let replyMarkup: any = undefined;
      if (appUrl) {
        const keyboard: any[] = [];
        const targetUrl = chatId
          ? `${appUrl}/archive/${encodeURIComponent(chatId)}`
          : `${appUrl}/archive`;

        keyboard.push([{ text: '📁 Открыть в архиве', web_app: { url: targetUrl } }]);
        replyMarkup = { inline_keyboard: keyboard };
      }

      // Send DIRECT private message to owner Telegram ID (NO business_connection_id)
      await bot.api.sendMessage(targetDestination.toString(), messageText, {
        parse_mode: 'HTML',
        reply_markup: replyMarkup,
      });

      delivered = true;
    } catch (err: any) {
      deliveryError = err?.description || err?.message || 'Telegram DM delivery failed';
      console.warn(`[OwnerNotification] Could not deliver direct DM to owner ${targetDestination.toString()} (${deliveryError}). Saved for Mini App inbox.`);
    }

    // 4. Update status in database
    if (record) {
      try {
        await prisma.ownerNotification.update({
          where: { id: record.id },
          data: {
            status: delivered ? 'SENT' : 'PENDING',
            error: deliveryError ?? null,
          },
        });
      } catch (updateErr: any) {
        console.warn('[OwnerNotification] Failed to update record status:', updateErr?.message);
      }
    }

    return {
      success: true,
      status: delivered ? 'SENT' : 'PENDING',
      notificationId: record?.id,
      deliveredViaTelegram: delivered,
      error: deliveryError,
    };
  }

  /**
   * Helper for notifying successful media or message archiving.
   */
  async notifyArchiveSuccess(params: {
    userId: string;
    telegramUserId: string | number | bigint;
    chatId?: string;
    chatTitle?: string;
    messageId?: number;
    mediaId?: string;
    mediaType?: string;
    isEphemeral?: boolean;
    details?: string;
  }): Promise<OwnerNotificationResult> {
    return this.notifyOwner({
      userId: params.userId,
      telegramUserId: params.telegramUserId,
      type: 'ARCHIVE_SUCCESS',
      title: '✅ Медиафайл сохранён',
      text: params.details || 'Медиафайл успешно зафиксирован и сохранён в вашем защищённом архиве SerkoGram.',
      chatId: params.chatId,
      chatTitle: params.chatTitle,
      messageId: params.messageId,
      mediaId: params.mediaId,
      mediaType: params.mediaType || 'Медиа',
      isEphemeral: params.isEphemeral,
    });
  }

  /**
   * Helper for notifying ephemeral / view-once media captures.
   */
  async notifyEphemeralSaved(params: {
    userId: string;
    telegramUserId: string | number | bigint;
    chatId?: string;
    chatTitle?: string;
    messageId?: number;
    mediaId?: string;
    mediaType?: string;
    details?: string;
  }): Promise<OwnerNotificationResult> {
    return this.notifyOwner({
      userId: params.userId,
      telegramUserId: params.telegramUserId,
      type: 'EPHEMERAL_SAVED',
      title: '🔥 Одноразовое медиа сохранено',
      text: params.details || 'Исчезающее / одноразовое медиа зафиксировано до самоуничтожения и сохранено в архиве.',
      chatId: params.chatId,
      chatTitle: params.chatTitle,
      messageId: params.messageId,
      mediaId: params.mediaId,
      mediaType: params.mediaType || 'Одноразовое фото/видео',
      isEphemeral: true,
    });
  }

  /**
   * Helper for notifying archive failures privately to the owner.
   */
  async notifyArchiveFailure(params: {
    userId: string;
    telegramUserId: string | number | bigint;
    chatId?: string;
    chatTitle?: string;
    messageId?: number;
    error: string;
  }): Promise<OwnerNotificationResult> {
    return this.notifyOwner({
      userId: params.userId,
      telegramUserId: params.telegramUserId,
      type: 'ARCHIVE_FAILURE',
      title: '⚠️ Ошибка сохранения медиа',
      text: `Не удалось сохранить медиафайл: ${escapeHtml(params.error)}`,
      chatId: params.chatId,
      chatTitle: params.chatTitle,
      messageId: params.messageId,
    });
  }

  /**
   * Helper for notifying private command results.
   */
  async notifyCommandResult(params: {
    userId: string;
    telegramUserId: string | number | bigint;
    command: string;
    title: string;
    text: string;
    chatId?: string;
    chatTitle?: string;
  }): Promise<OwnerNotificationResult> {
    return this.notifyOwner({
      userId: params.userId,
      telegramUserId: params.telegramUserId,
      type: 'COMMAND_RESULT',
      title: params.title,
      text: params.text,
      chatId: params.chatId,
      chatTitle: params.chatTitle,
    });
  }

  /**
   * Fetches notifications for owner Mini App inbox.
   */
  async getOwnerNotifications(
    userId: string,
    options?: { unreadOnly?: boolean; limit?: number; cursor?: string }
  ): Promise<{ items: OwnerNotification[]; unreadCount: number }> {
    const limit = Math.min(options?.limit ?? 50, 100);
    const where: any = { userId };

    if (options?.unreadOnly) {
      where.status = { in: ['PENDING', 'SENT'] };
    }

    const [items, unreadCount] = await Promise.all([
      prisma.ownerNotification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.ownerNotification.count({
        where: {
          userId,
          status: { in: ['PENDING', 'SENT'] },
        },
      }),
    ]);

    return { items, unreadCount };
  }

  /**
   * Marks specified notifications or all user notifications as read.
   */
  async markNotificationsAsRead(userId: string, notificationIds?: string[]): Promise<number> {
    const where: any = { userId };
    if (notificationIds && notificationIds.length > 0) {
      where.id = { in: notificationIds };
    }

    const res = await prisma.ownerNotification.updateMany({
      where,
      data: {
        status: 'READ',
        readAt: new Date(),
      },
    });

    return res.count;
  }

  /**
   * Returns count of unread notifications for owner.
   */
  async getUnreadNotificationCount(userId: string): Promise<number> {
    return prisma.ownerNotification.count({
      where: {
        userId,
        status: { in: ['PENDING', 'SENT'] },
      },
    });
  }
}

export const ownerNotificationService = new OwnerNotificationService();
