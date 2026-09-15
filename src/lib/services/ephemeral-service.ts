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

  // If message or media is not in DB yet, but raw reply_to_message object contains media
  if ((!message || message.media.length === 0) && rawReplyToObj) {
    let fileId: string | undefined;
    let fileUniqueId: string | undefined;
    let mediaType: any = 'PHOTO';
    let fileName: string | undefined;
    let mimeType: string | undefined;
    let fileSize: number | undefined;

    if (rawReplyToObj.photo && rawReplyToObj.photo.length > 0) {
      const p = rawReplyToObj.photo[rawReplyToObj.photo.length - 1];
      fileId = p.file_id;
      fileUniqueId = p.file_unique_id;
      fileSize = p.file_size;
      mediaType = 'PHOTO';
      mimeType = 'image/jpeg';
    } else if (rawReplyToObj.video) {
      fileId = rawReplyToObj.video.file_id;
      fileUniqueId = rawReplyToObj.video.file_unique_id;
      fileSize = rawReplyToObj.video.file_size;
      mediaType = 'VIDEO';
      mimeType = rawReplyToObj.video.mime_type || 'video/mp4';
      fileName = rawReplyToObj.video.file_name;
    } else if (rawReplyToObj.voice) {
      fileId = rawReplyToObj.voice.file_id;
      fileUniqueId = rawReplyToObj.voice.file_unique_id;
      fileSize = rawReplyToObj.voice.file_size;
      mediaType = 'VOICE';
      mimeType = rawReplyToObj.voice.mime_type || 'audio/ogg';
    } else if (rawReplyToObj.video_note) {
      fileId = rawReplyToObj.video_note.file_id;
      fileUniqueId = rawReplyToObj.video_note.file_unique_id;
      fileSize = rawReplyToObj.video_note.file_size;
      mediaType = 'VIDEO_NOTE';
      mimeType = 'video/mp4';
    } else if (rawReplyToObj.document) {
      fileId = rawReplyToObj.document.file_id;
      fileUniqueId = rawReplyToObj.document.file_unique_id;
      fileSize = rawReplyToObj.document.file_size;
      mediaType = 'DOCUMENT';
      mimeType = rawReplyToObj.document.mime_type || 'application/octet-stream';
      fileName = rawReplyToObj.document.file_name;
    }

    if (fileId && fileUniqueId) {
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
            messageType: mediaType || 'PHOTO',
            text: rawReplyToObj.caption || rawReplyToObj.text,
            telegramDate: new Date((rawReplyToObj.date || Math.floor(Date.now() / 1000)) * 1000),
          },
          update: {},
        });

        await downloadAndStoreMedia(
          targetMsg.id,
          fileId,
          fileUniqueId,
          mediaType,
          { fileName, mimeType, fileSize }
        );

        const storedMedia = await prisma.messageMedia.findFirst({
          where: { messageId: targetMsg.id, fileUniqueId },
        });

        const ephAttr = detectEphemeralAttributes(rawReplyToObj);
        return {
          success: true,
          archiveStatus: 'ARCHIVED',
          message: `Медиафайл успешно зафиксирован и сохранён в защищённом архиве SerkoGram!`,
          media: storedMedia,
          isViewOnce: ephAttr.isViewOnce,
          isEphemeral: ephAttr.isEphemeral,
        };
      } catch (dlErr: any) {
        console.warn('[EphemeralService] Direct download note:', dlErr?.message);
      }
    }
  }

  if (!message) {
    return {
      success: false,
      archiveStatus: 'UNAVAILABLE',
      message: 'Сообщение с медиафайлом не найдено в архиве для сохранения.',
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

  if (message.media.length === 0) {
    return {
      success: false,
      archiveStatus: 'UNAVAILABLE',
      message: 'В ответном сообщении не обнаружено медиафайлов для сохранения.',
      error: 'В ответном сообщении не обнаружено медиафайлов',
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