// ============================================================
// SerkoGram — Message Service
// Core business logic for message archiving
// ============================================================

import { prisma } from '@/lib/db';
import type { Message, MessageType, Prisma } from '@prisma/client';

interface SaveMessageInput {
  chatId: string;
  telegramMessageId: number;
  businessConnectionId?: string;
  senderTelegramId?: bigint;
  senderName?: string;
  senderUsername?: string;
  isOutgoing: boolean;
  messageType: MessageType;
  text?: string;
  caption?: string;
  replyToMessageId?: number;
  forwardFromName?: string;
  telegramDate: Date;
  rawData?: Prisma.InputJsonValue;
}

interface SaveEditInput {
  chatId: string;
  telegramMessageId: number;
  newText?: string;
  newCaption?: string;
  editedAt: Date;
}

/**
 * Save or update a message in the archive.
 * Uses upsert to handle idempotent processing.
 */
export async function saveMessage(input: SaveMessageInput): Promise<Message> {
  const message = await prisma.message.upsert({
    where: {
      chatId_telegramMessageId: {
        chatId: input.chatId,
        telegramMessageId: input.telegramMessageId,
      },
    },
    create: {
      chatId: input.chatId,
      telegramMessageId: input.telegramMessageId,
      businessConnectionId: input.businessConnectionId,
      senderTelegramId: input.senderTelegramId,
      senderName: input.senderName,
      senderUsername: input.senderUsername,
      isOutgoing: input.isOutgoing,
      messageType: input.messageType,
      text: input.text,
      caption: input.caption,
      replyToMessageId: input.replyToMessageId,
      forwardFromName: input.forwardFromName,
      telegramDate: input.telegramDate,
      rawData: input.rawData,
    },
    update: {
      // On duplicate — just update metadata, don't overwrite content
      senderName: input.senderName,
      senderUsername: input.senderUsername,
      rawData: input.rawData,
    },
  });

  // Update chat counters
  await prisma.chat.update({
    where: { id: input.chatId },
    data: {
      totalMessages: { increment: 1 },
      lastMessageAt: input.telegramDate,
      lastMessagePreview: input.text?.substring(0, 100) ?? input.caption?.substring(0, 100) ?? `[${input.messageType}]`,
    },
  });

  return message;
}

/**
 * Process an edited message:
 * 1. Save the current version to message_versions
 * 2. Update the message with new content
 */
export async function processEditedMessage(input: SaveEditInput): Promise<Message | null> {
  const existing = await prisma.message.findUnique({
    where: {
      chatId_telegramMessageId: {
        chatId: input.chatId,
        telegramMessageId: input.telegramMessageId,
      },
    },
    include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
  });

  if (!existing) return null;

  const nextVersion = (existing.versions[0]?.version ?? 0) + 1;

  // Save current content as a version before updating
  await prisma.messageVersion.create({
    data: {
      messageId: existing.id,
      version: nextVersion,
      text: existing.text,
      caption: existing.caption,
      editedAt: input.editedAt,
    },
  });

  // Update the message with new content
  const updated = await prisma.message.update({
    where: { id: existing.id },
    data: {
      text: input.newText ?? existing.text,
      caption: input.newCaption ?? existing.caption,
      isEdited: true,
      editedAt: input.editedAt,
    },
  });

  // Update chat counter
  await prisma.chat.update({
    where: { id: input.chatId },
    data: { editedMessages: { increment: 1 } },
  });

  return updated;
}

/**
 * Process deleted messages:
 * Mark messages as deleted and create deletion records.
 */
export async function processDeletedMessages(
  chatId: string,
  telegramMessageIds: number[],
  deletedAt: Date
): Promise<number> {
  let count = 0;

  for (const tmId of telegramMessageIds) {
    const message = await prisma.message.findUnique({
      where: {
        chatId_telegramMessageId: {
          chatId,
          telegramMessageId: tmId,
        },
      },
    });

    if (!message) continue;

    await prisma.$transaction([
      prisma.message.update({
        where: { id: message.id },
        data: {
          isDeleted: true,
          deletedAt,
        },
      }),
      prisma.messageDeletion.upsert({
        where: { messageId: message.id },
        create: {
          messageId: message.id,
          deletedAt,
        },
        update: {
          deletedAt,
        },
      }),
    ]);

    count++;
  }

  // Update chat counter
  if (count > 0) {
    await prisma.chat.update({
      where: { id: chatId },
      data: { deletedMessages: { increment: count } },
    });
  }

  return count;
}

/**
 * Get messages for a chat with pagination
 */
export async function getChatMessages(
  chatId: string,
  userId: string,
  options: {
    cursor?: string;
    limit?: number;
    filter?: string;
  } = {}
) {
  const { cursor, limit = 30, filter } = options;

  // Verify user owns this chat through connection
  const chat = await prisma.chat.findFirst({
    where: {
      id: chatId,
      connection: { userId },
    },
  });

  if (!chat) return null;

  const where: Prisma.MessageWhereInput = { chatId };

  // Apply filters
  switch (filter) {
    case 'deleted':
      where.isDeleted = true;
      break;
    case 'edited':
      where.isEdited = true;
      break;
    case 'photo':
      where.messageType = 'PHOTO';
      break;
    case 'video':
      where.messageType = 'VIDEO';
      break;
    case 'voice':
      where.messageType = { in: ['VOICE', 'VIDEO_NOTE'] };
      break;
    case 'document':
      where.messageType = 'DOCUMENT';
      break;
  }

  const messages = await prisma.message.findMany({
    where,
    include: {
      media: true,
      versions: { orderBy: { version: 'desc' } },
    },
    orderBy: { telegramDate: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = messages.length > limit;
  const items = hasMore ? messages.slice(0, limit) : messages;

  return {
    items,
    hasMore,
    nextCursor: hasMore ? items[items.length - 1]?.id : undefined,
  };
}

/**
 * Get message versions (edit history)
 */
export async function getMessageVersions(messageId: string, userId: string) {
  const message = await prisma.message.findFirst({
    where: {
      id: messageId,
      chat: { connection: { userId } },
    },
    include: {
      versions: { orderBy: { version: 'asc' } },
    },
  });

  return message?.versions ?? null;
}
