// ============================================================
// SerkoGram — Ephemeral / View-Once Media Service
// ============================================================

import { prisma } from '@/lib/db';
import { downloadAndStoreMedia } from './media-service';
import type { MessageMedia, ArchiveStatus } from '@prisma/client';

export interface EphemeralSaveResult {
  success: boolean;
  archiveStatus: ArchiveStatus;
  message: string;
  media?: MessageMedia | null;
}

/**
 * Checks if a Telegram message contains ephemeral or self-destructing media indicators.
 */
export function detectEphemeralAttributes(tgMsg: any): {
  isEphemeral: boolean;
  isViewOnce: boolean;
  ttlSeconds?: number;
} {
  if (!tgMsg) {
    return { isEphemeral: false, isViewOnce: false };
  }

  // Telegram Bot API & MTProto indicators
  const ttl = tgMsg.ttl_seconds ?? tgMsg.media_ttl_seconds ?? tgMsg.photo_ttl ?? tgMsg.video_ttl;
  const isViewOnce = Boolean(
    tgMsg.is_view_once ||
    tgMsg.view_once ||
    (ttl !== undefined && ttl > 0 && ttl <= 60)
  );

  const isEphemeral = Boolean(ttl !== undefined && ttl > 0) || isViewOnce;

  return {
    isEphemeral,
    isViewOnce,
    ttlSeconds: typeof ttl === 'number' ? ttl : undefined,
  };
}

/**
 * Processes saving an ephemeral media item from a replied message.
 */
export async function saveEphemeralMedia(
  chatId: string,
  replyToMessageId: number,
  userId: string
): Promise<EphemeralSaveResult> {
  const message = await prisma.message.findUnique({
    where: {
      chatId_telegramMessageId: {
        chatId,
        telegramMessageId: replyToMessageId,
      },
    },
    include: {
      media: true,
      chat: {
        include: {
          connection: true,
        },
      },
    },
  });

  if (!message) {
    return {
      success: false,
      archiveStatus: 'UNAVAILABLE',
      message: 'Сообщение с медиафайлом не найдено в архиве для сохранения.',
    };
  }

  // Verify ownership
  if (message.chat.connection.userId !== userId) {
    return {
      success: false,
      archiveStatus: 'UNAVAILABLE',
      message: 'Доступ ограничен: чужой диалог.',
    };
  }

  if (message.media.length === 0) {
    return {
      success: false,
      archiveStatus: 'UNAVAILABLE',
      message: 'В ответном сообщении не обнаружено медиафайлов для сохранения.',
    };
  }

  const media = message.media[0];

  // If already archived and downloaded successfully
  if (media.isDownloaded && media.storageUrl) {
    return {
      success: true,
      archiveStatus: 'ARCHIVED',
      message: 'Медиафайл уже успешно сохранён в защищённом архиве SerkoGram.',
      media,
    };
  }

  // Attempt to download and store
  try {
    if (media.telegramFileId && media.fileUniqueId) {
      await downloadAndStoreMedia(
        message.id,
        media.telegramFileId,
        media.fileUniqueId,
        media.mediaType,
        {
          fileName: media.fileName || undefined,
          mimeType: media.mimeType || undefined,
          fileSize: media.fileSize || undefined,
        }
      );

      const updated = await prisma.messageMedia.update({
        where: { id: media.id },
        data: {
          isEphemeral: true,
          isViewOnce: true,
          archiveStatus: 'ARCHIVED',
          archivedAt: new Date(),
          ephemeralDetectedAt: new Date(),
        },
      });

      return {
        success: true,
        archiveStatus: 'ARCHIVED',
        message: 'Одноразовый медиафайл успешно зафиксирован и сохранён в вашем архиве!',
        media: updated,
      };
    }

    // If no telegramFileId available (expired from Telegram cache)
    const expiredRecord = await prisma.messageMedia.update({
      where: { id: media.id },
      data: {
        isEphemeral: true,
        isViewOnce: true,
        archiveStatus: 'EXPIRED_BEFORE_ARCHIVE',
        archiveError: 'Срок действия медиа истёк на серверах Telegram до загрузки в архив.',
      },
    });

    return {
      success: false,
      archiveStatus: 'EXPIRED_BEFORE_ARCHIVE',
      message: 'Медиафайл уже истёк на серверах Telegram и недоступен для сохранения.',
      media: expiredRecord,
    };
  } catch (error: any) {
    console.error('[EphemeralService] Failed to save ephemeral media:', error);

    const failedRecord = await prisma.messageMedia.update({
      where: { id: media.id },
      data: {
        isEphemeral: true,
        archiveStatus: 'FAILED',
        archiveError: error.message || 'Ошибка загрузки медиафайла',
      },
    });

    return {
      success: false,
      archiveStatus: 'FAILED',
      message: 'Не удалось сохранить одноразовый медиафайл: ошибка передачи данных.',
      media: failedRecord,
    };
  }
}