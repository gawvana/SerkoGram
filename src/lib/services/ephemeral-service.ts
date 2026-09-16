// ============================================================
// SerkoGram — Ephemeral / View-Once Media Service
// ============================================================

import { prisma } from '@/lib/db';
import { downloadAndStoreMedia, extractTelegramMedia } from './media-service';
import type { MessageMedia, ArchiveStatus } from '@prisma/client';

export interface EphemeralSaveResult {
  success: boolean;
  archiveStatus: ArchiveStatus;
  message: string;
  media?: MessageMedia | null;
  isViewOnce?: boolean;
  isEphemeral?: boolean;
  error?: string;
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
  userId: string,
  rawReplyToObj?: any
): Promise<EphemeralSaveResult> {
  let message = await prisma.message.findUnique({
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

  // 1. If rawReplyToObj contains media, extract canonically
  if (rawReplyToObj) {
    const extracted = extractTelegramMedia(rawReplyToObj);
    if (extracted) {
      try {
        const targetMsg = message || await prisma.message.upsert({
          where: {
            chatId_telegramMessageId: {
              chatId,
              telegramMessageId: replyToMessageId,
            },
          },
          create: {
            chatId,
            telegramMessageId: replyToMessageId,
            isOutgoing: false,
            messageType: extracted.mediaType,
            text: rawReplyToObj.caption || rawReplyToObj.text,
            telegramDate: new Date((rawReplyToObj.date || Math.floor(Date.now() / 1000)) * 1000),
          },
          update: {},
        });

        const dlResult = await downloadAndStoreMedia(
          targetMsg.id,
          extracted.fileId,
          extracted.fileUniqueId,
          extracted.mediaType.toLowerCase(),
          {
            fileName: extracted.fileName,
            mimeType: extracted.mimeType,
            fileSize: extracted.fileSize,
            width: extracted.width,
            height: extracted.height,
            duration: extracted.duration,
            isEphemeral: extracted.isEphemeral,
            isViewOnce: extracted.isViewOnce,
            ttlSeconds: extracted.ttlSeconds,
          }
        );

        if (!dlResult.success) {
          return {
            success: false,
            archiveStatus: 'FAILED',
            message: dlResult.error || 'Ошибка загрузки медиафайла',
            error: dlResult.error || 'Ошибка загрузки медиафайла',
          };
        }

        const storedMedia = await prisma.messageMedia.findFirst({
          where: { messageId: targetMsg.id, fileUniqueId: extracted.fileUniqueId },
        });

        return {
          success: true,
          archiveStatus: 'ARCHIVED',
          message: 'Медиафайл успешно зафиксирован и сохранён в защищённом архиве SerkoGram!',
          media: storedMedia,
          isViewOnce: extracted.isViewOnce,
          isEphemeral: extracted.isEphemeral,
        };
      } catch (dlErr: any) {
        console.warn('[EphemeralService] Direct download note:', dlErr?.message);
        return {
          success: false,
          archiveStatus: 'FAILED',
          message: 'Ошибка при сохранении медиафайла',
          error: dlErr?.message,
        };
      }
    }

    // 2. If rawReplyToObj is a plain text message: archive text message!
    if (rawReplyToObj.text) {
      await prisma.message.upsert({
        where: {
          chatId_telegramMessageId: {
            chatId,
            telegramMessageId: replyToMessageId,
          },
        },
        create: {
          chatId,
          telegramMessageId: replyToMessageId,
          isOutgoing: false,
          messageType: 'TEXT',
          text: rawReplyToObj.text,
          telegramDate: new Date((rawReplyToObj.date || Math.floor(Date.now() / 1000)) * 1000),
        },
        update: {
          text: rawReplyToObj.text,
        },
      });

      return {
        success: true,
        archiveStatus: 'ARCHIVED',
        message: 'Текстовое сообщение успешно сохранено в вашем защищённом архиве SerkoGram!',
      };
    }
  }

  // 3. Fallback to existing message in DB
  if (!message) {
    return {
      success: false,
      archiveStatus: 'UNAVAILABLE',
      message: 'Сообщение не найдено в архиве для сохранения.',
      error: 'Сообщение не найдено в архиве',
    };
  }

  // Verify ownership
  if (message.chat?.connection && message.chat.connection.userId !== userId) {
    return {
      success: false,
      archiveStatus: 'UNAVAILABLE',
      message: 'Доступ ограничен: чужой диалог.',
      error: 'Доступ ограничен: чужой диалог',
    };
  }

  // If existing message is text without media
  if (message.media.length === 0) {
    if (message.text) {
      return {
        success: true,
        archiveStatus: 'ARCHIVED',
        message: 'Сообщение успешно сохранено в вашем защищённом архиве SerkoGram.',
      };
    }
    return {
      success: false,
      archiveStatus: 'UNAVAILABLE',
      message: 'В ответном сообщении не обнаружено медиафайлов или сохраняемого текста.',
      error: 'В ответном сообщении нет медиафайлов или текста для сохранения',
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
      isViewOnce: media.isViewOnce,
      isEphemeral: media.isEphemeral,
    };
  }

  // Attempt to download and store
  try {
    if (media.telegramFileId && media.fileUniqueId) {
      const dlRes = await downloadAndStoreMedia(
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

      if (!dlRes.success) {
        return {
          success: false,
          archiveStatus: 'FAILED',
          message: dlRes.error || 'Ошибка загрузки медиафайла',
          error: dlRes.error || 'Ошибка загрузки медиафайла',
        };
      }

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
        isViewOnce: true,
        isEphemeral: true,
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
      isViewOnce: true,
      isEphemeral: true,
      error: 'Срок действия медиа истёк на серверах Telegram до загрузки в архив.',
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
      isEphemeral: true,
      error: error?.message || 'Ошибка загрузки медиафайла',
    };
  }
}