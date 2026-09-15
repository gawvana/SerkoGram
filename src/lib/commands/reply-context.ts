// ============================================================
// SerkoGram — Reply Context Resolver
// ============================================================

import { prisma } from '@/lib/db';
import type { Message, MessageMedia } from '@prisma/client';

export interface ResolvedReplyContext {
  hasReply: boolean;
  replyToMessageId?: number;
  repliedMessage?: Message & { media: MessageMedia[] };
  sender?: {
    id?: bigint;
    name?: string;
    username?: string;
  };
  media?: MessageMedia | null;
  text?: string;
  errorMessage?: string;
}

/**
 * Resolves context when a command is executed as a reply to another message.
 * Inspects both the local database archive and the raw Telegram reply_to_message object.
 */
export async function resolveReplyContext(
  chatId: string,
  replyToMessageId?: number,
  replyToMessageObj?: any
): Promise<ResolvedReplyContext> {
  if (!replyToMessageId) {
    return {
      hasReply: false,
      errorMessage: 'Команда должна быть отправлена в ответ на другое сообщение.',
    };
  }

  try {
    const message = await prisma.message.findUnique({
      where: {
        chatId_telegramMessageId: {
          chatId,
          telegramMessageId: replyToMessageId,
        },
      },
      include: {
        media: true,
      },
    });

    if (message) {
      return {
        hasReply: true,
        replyToMessageId,
        repliedMessage: message,
        sender: {
          id: message.senderTelegramId ?? undefined,
          name: message.senderName ?? undefined,
          username: message.senderUsername ?? undefined,
        },
        media: message.media.length > 0 ? message.media[0] : null,
        text: message.text || message.caption || undefined,
      };
    }

    // Fallback: extract author and content directly from raw Telegram reply_to_message object
    if (replyToMessageObj) {
      const from = replyToMessageObj.from;
      const senderName = from
        ? [from.first_name, from.last_name].filter(Boolean).join(' ')
        : 'Неизвестный пользователь';

      let syntheticMedia: any = null;
      if (replyToMessageObj.photo && replyToMessageObj.photo.length > 0) {
        const p = replyToMessageObj.photo[replyToMessageObj.photo.length - 1];
        syntheticMedia = { mediaType: 'PHOTO', fileId: p.file_id, fileUniqueId: p.file_unique_id };
      } else if (replyToMessageObj.video) {
        syntheticMedia = { mediaType: 'VIDEO', fileId: replyToMessageObj.video.file_id, fileUniqueId: replyToMessageObj.video.file_unique_id };
      } else if (replyToMessageObj.voice) {
        syntheticMedia = { mediaType: 'VOICE', fileId: replyToMessageObj.voice.file_id, fileUniqueId: replyToMessageObj.voice.file_unique_id };
      } else if (replyToMessageObj.video_note) {
        syntheticMedia = { mediaType: 'VIDEO_NOTE', fileId: replyToMessageObj.video_note.file_id, fileUniqueId: replyToMessageObj.video_note.file_unique_id };
      } else if (replyToMessageObj.document) {
        syntheticMedia = { mediaType: 'DOCUMENT', fileId: replyToMessageObj.document.file_id, fileUniqueId: replyToMessageObj.document.file_unique_id };
      }

      return {
        hasReply: true,
        replyToMessageId,
        sender: from
          ? {
              id: BigInt(from.id),
              name: senderName,
              username: from.username,
            }
          : undefined,
        media: syntheticMedia,
        text: replyToMessageObj.text || replyToMessageObj.caption,
      };
    }

    return {
      hasReply: true,
      replyToMessageId,
      errorMessage: 'Сообщение, на которое дан ответ, не найдено в локальном архиве.',
    };
  } catch (error) {
    console.error('[ReplyContextResolver] Error resolving reply context:', error);
    return {
      hasReply: true,
      replyToMessageId,
      errorMessage: 'Ошибка чтения контекста ответного сообщения.',
    };
  }
}