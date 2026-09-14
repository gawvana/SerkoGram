// ============================================================
// SerkoGram — Search Service
// Full-text search across user's message archive
// ============================================================

import { prisma } from '@/lib/db';
import type { Prisma, MessageType } from '@prisma/client';

export interface SearchOptions {
  userId: string;
  query: string;
  chatId?: string;
  messageType?: MessageType;
  isDeleted?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  cursor?: string;
  limit?: number;
}

export async function searchMessages(options: SearchOptions) {
  const {
    userId,
    query,
    chatId,
    messageType,
    isDeleted,
    dateFrom,
    dateTo,
    cursor,
    limit = 30,
  } = options;

  const where: Prisma.MessageWhereInput = {
    chat: {
      connection: { userId },
      ...(chatId ? { id: chatId } : {}),
    },
    ...(messageType ? { messageType } : {}),
    ...(typeof isDeleted === 'boolean' ? { isDeleted } : {}),
    ...(dateFrom || dateTo
      ? {
          telegramDate: {
            ...(dateFrom ? { gte: dateFrom } : {}),
            ...(dateTo ? { lte: dateTo } : {}),
          },
        }
      : {}),
  };

  // Text search across text and caption
  if (query.trim()) {
    where.OR = [
      { text: { contains: query, mode: 'insensitive' } },
      { caption: { contains: query, mode: 'insensitive' } },
      { senderName: { contains: query, mode: 'insensitive' } },
    ];
  }

  const messages = await prisma.message.findMany({
    where,
    include: {
      media: true,
      chat: {
        select: {
          id: true,
          title: true,
          telegramChatId: true,
        },
      },
    },
    orderBy: { telegramDate: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = messages.length > limit;
  const items = hasMore ? messages.slice(0, limit) : messages;

  return {
    items: items.map((msg) => ({
      message: msg,
      chatTitle: msg.chat.title,
      chatId: msg.chat.id,
      highlight: createHighlight(msg.text ?? msg.caption ?? '', query),
    })),
    hasMore,
    nextCursor: hasMore ? items[items.length - 1]?.id : undefined,
  };
}

function createHighlight(text: string, query: string): string {
  if (!query.trim() || !text) return text.substring(0, 100);

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const idx = lowerText.indexOf(lowerQuery);

  if (idx === -1) return text.substring(0, 100);

  const start = Math.max(0, idx - 30);
  const end = Math.min(text.length, idx + query.length + 30);

  let snippet = '';
  if (start > 0) snippet += '...';
  snippet += text.substring(start, end);
  if (end < text.length) snippet += '...';

  return snippet;
}
