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
 */
export async function resolveReplyContext(
  chatId: string,
  replyToMessageId?: number
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

    if (!message) {
      return {
        hasReply: true,
        replyToMessageId,
        errorMessage: 'Сообщение, на которое дан ответ, не найдено в локальном архиве.',
      };
    }

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
  } catch (error) {
    console.error('[ReplyContextResolver] Error resolving reply context:', error);
    return {
      hasReply: true,
      replyToMessageId,
      errorMessage: 'Ошибка чтения контекста ответного сообщения.',
    };
  }
}