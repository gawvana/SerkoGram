// ============================================================
// SerkoGram — Message Service (Canonical v2)
// Core business logic for message archiving & edit/delete tracking
// strictly conforming to §5, §9, §12, §13 of Specification
// ============================================================

import { prisma } from '@/lib/db';
import type { Message, MessageType, ArchiveMessage, Prisma } from '@prisma/client';

export interface SaveArchiveMessageInput {
  connectionId: string;
  telegramChatId: bigint;
  telegramMessageId: bigint;
  businessConnectionId: string;
  senderTelegramId?: bigint;
  senderName?: string;
  senderUsername?: string;
  isOutgoing: boolean;
  messageType: string;
  text?: string;
  caption?: string;
  entities?: Prisma.InputJsonValue;
  replyToMessageId?: bigint;
  forwardFromName?: string;
  telegramDate: Date;
  chatId?: string;
}

export interface SaveArchiveEditInput {
  connectionId: string;
  telegramChatId: bigint;
  telegramMessageId: bigint;
  newText?: string;
  newCaption?: string;
  editedAt: Date;
}

export interface SaveArchiveDeleteInput {
  connectionId: string;
  telegramChatId: bigint;
  messageIds: number[];
  deletedAt: Date;
}

/**
 * Canonical Archive Pipeline (§9)
 * Idempotently saves a message to ArchiveMessage via [connectionId, telegramChatId, telegramMessageId].
 * Re-reads from DB to confirm persistence (§9, step 8).
 */
export async function saveArchiveMessage(
  input: SaveArchiveMessageInput
): Promise<ArchiveMessage> {
  const archiveMessage = await prisma.archiveMessage.upsert({
    where: {
      connectionId_telegramChatId_telegramMessageId: {
        connectionId: input.connectionId,
        telegramChatId: input.telegramChatId,
        telegramMessageId: input.telegramMessageId,
      },
    },
    create: {
      connectionId: input.connectionId,
      telegramChatId: input.telegramChatId,
      telegramMessageId: input.telegramMessageId,
      businessConnectionId: input.businessConnectionId,
      senderTelegramId: input.senderTelegramId,
      senderName: input.senderName,
      senderUsername: input.senderUsername,
      isOutgoing: input.isOutgoing,
      messageType: input.messageType,
      text: input.text,
      caption: input.caption,
      entities: input.entities,
      replyToMessageId: input.replyToMessageId,
      forwardFromName: input.forwardFromName,
      telegramDate: input.telegramDate,
      chatId: input.chatId,
    },
    update: {
      senderTelegramId: input.senderTelegramId,
      senderName: input.senderName,
      senderUsername: input.senderUsername,
      isOutgoing: input.isOutgoing,
      messageType: input.messageType,
      text: input.text,
      caption: input.caption,
      entities: input.entities,
      replyToMessageId: input.replyToMessageId,
      forwardFromName: input.forwardFromName,
      telegramDate: input.telegramDate,
      chatId: input.chatId,
    },
  });

  // Re-read back to guarantee persistence (§9, step 8)
  const confirmed = await prisma.archiveMessage.findUnique({
    where: { id: archiveMessage.id },
  });

  if (!confirmed) {
    throw new Error(`[ArchivePipeline] Critical persistence failure: row ${archiveMessage.id} could not be read back.`);
  }

  // Update chat summary counters if chatId is available
  if (input.chatId) {
    await prisma.chat.update({
      where: { id: input.chatId },
      data: {
        totalMessages: { increment: 1 },
        lastMessageAt: input.telegramDate,
        lastMessagePreview:
          input.text?.substring(0, 100) ??
          input.caption?.substring(0, 100) ??
          `[${input.messageType}]`,
      },
    }).catch(() => null);
  }

  return confirmed;
}

/**
 * Edit Tracking (§12)
 * Snapshots previous version into editHistory and updates ArchiveMessage.
 */
export async function processArchiveEdit(
  input: SaveArchiveEditInput
): Promise<ArchiveMessage | null> {
  const existing = await prisma.archiveMessage.findUnique({
    where: {
      connectionId_telegramChatId_telegramMessageId: {
        connectionId: input.connectionId,
        telegramChatId: input.telegramChatId,
        telegramMessageId: input.telegramMessageId,
      },
    },
  });

  if (!existing) return null;

  // Snapshot previous content into editHistory array
  const currentHistory = Array.isArray(existing.editHistory)
    ? (existing.editHistory as any[])
    : [];

  const newHistory = [
    ...currentHistory,
    {
      text: existing.text,
      caption: existing.caption,
      editedAt: input.editedAt.toISOString(),
    },
  ];

  const updated = await prisma.archiveMessage.update({
    where: { id: existing.id },
    data: {
      text: input.newText !== undefined ? input.newText : existing.text,
      caption: input.newCaption !== undefined ? input.newCaption : existing.caption,
      editedAt: input.editedAt,
      editHistory: newHistory,
    },
  });

  return updated;
}

/**
 * Delete Tracking (§13)
 * Resolves each message by message_id and marks deletedAt.
 */
export async function processArchiveDeletes(
  input: SaveArchiveDeleteInput
): Promise<number> {
  let count = 0;
  for (const msgId of input.messageIds) {
    const updated = await prisma.archiveMessage.updateMany({
      where: {
        connectionId: input.connectionId,
        telegramChatId: input.telegramChatId,
        telegramMessageId: BigInt(msgId),
        deletedAt: null,
      },
      data: {
        deletedAt: input.deletedAt,
      },
    });
    count += updated.count;
  }
  return count;
}

// ============================================================
// Dual-write legacy compatibility functions
// ============================================================

export async function saveMessage(input: {
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
}): Promise<Message> {
  const chat = typeof prisma.chat?.findUnique === 'function'
    ? await prisma.chat.findUnique({
        where: { id: input.chatId },
      }).catch(() => null)
    : null;

  if (chat && chat.connectionId) {
    await saveArchiveMessage({
      connectionId: chat.connectionId,
      telegramChatId: chat.telegramChatId,
      telegramMessageId: BigInt(input.telegramMessageId),
      businessConnectionId: input.businessConnectionId || '',
      senderTelegramId: input.senderTelegramId,
      senderName: input.senderName,
      senderUsername: input.senderUsername,
      isOutgoing: input.isOutgoing,
      messageType: input.messageType,
      text: input.text,
      caption: input.caption,
      replyToMessageId: input.replyToMessageId ? BigInt(input.replyToMessageId) : undefined,
      forwardFromName: input.forwardFromName,
      telegramDate: input.telegramDate,
      chatId: chat.id,
    }).catch((err) => console.warn('[ArchiveMessage] Dual-write notice:', err?.message));
  }

  if (typeof prisma.chat?.update === 'function') {
    await prisma.chat.update({
      where: { id: input.chatId },
      data: {
        totalMessages: { increment: 1 },
        lastMessageAt: input.telegramDate,
        lastMessagePreview:
          input.text?.substring(0, 100) ??
          input.caption?.substring(0, 100) ??
          `[${input.messageType}]`,
      },
    }).catch(() => null);
  }

  return prisma.message.upsert({
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
  });
}

export async function processEditedMessage(input: {
  chatId: string;
  telegramMessageId: number;
  newText?: string;
  newCaption?: string;
  editedAt: Date;
}): Promise<Message | null> {
  const chat = typeof prisma.chat?.findUnique === 'function'
    ? await prisma.chat.findUnique({
        where: { id: input.chatId },
      }).catch(() => null)
    : null;

  if (chat && chat.connectionId) {
    await processArchiveEdit({
      connectionId: chat.connectionId,
      telegramChatId: chat.telegramChatId,
      telegramMessageId: BigInt(input.telegramMessageId),
      newText: input.newText,
      newCaption: input.newCaption,
      editedAt: input.editedAt,
    }).catch(() => null);
  }

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

  await prisma.messageVersion.create({
    data: {
      messageId: existing.id,
      version: nextVersion,
      text: existing.text,
      caption: existing.caption,
      editedAt: input.editedAt,
    },
  });

  return prisma.message.update({
    where: { id: existing.id },
    data: {
      text: input.newText !== undefined ? input.newText : existing.text,
      caption: input.newCaption !== undefined ? input.newCaption : existing.caption,
      isEdited: true,
      editedAt: input.editedAt,
    },
  });
}

export async function processDeletedMessages(
  chatId: string,
  messageIds: number[],
  deletedAt: Date
): Promise<number> {
  const chat = typeof prisma.chat?.findUnique === 'function'
    ? await prisma.chat.findUnique({
        where: { id: chatId },
      }).catch(() => null)
    : null;

  if (chat && chat.connectionId) {
    await processArchiveDeletes({
      connectionId: chat.connectionId,
      telegramChatId: chat.telegramChatId,
      messageIds,
      deletedAt,
    }).catch(() => null);
  }

  let count = 0;
  for (const msgId of messageIds) {
    const msg = await prisma.message.findUnique({
      where: {
        chatId_telegramMessageId: {
          chatId,
          telegramMessageId: msgId,
        },
      },
    });

    if (msg) {
      if (typeof prisma.$transaction === 'function') {
        await prisma.$transaction([
          prisma.message.update({
            where: { id: msg.id },
            data: {
              isDeleted: true,
              deletedAt,
            },
          }),
          prisma.messageDeletion.upsert({
            where: { messageId: msg.id },
            create: {
              messageId: msg.id,
              deletedAt,
            },
            update: {
              deletedAt,
            },
          }),
        ]);
      } else {
        await prisma.message.update({
          where: { id: msg.id },
          data: {
            isDeleted: true,
            deletedAt,
          },
        });

        await prisma.messageDeletion.upsert({
          where: { messageId: msg.id },
          create: {
            messageId: msg.id,
            deletedAt,
          },
          update: {
            deletedAt,
          },
        });
      }

      count++;
    }
  }

  if (count > 0 && typeof prisma.chat?.update === 'function') {
    await Promise.resolve(
      prisma.chat.update({
        where: { id: chatId },
        data: { deletedMessages: { increment: count } },
      })
    ).catch(() => null);
  }

  return count;
}

/**
 * Retrieve edit versions of a message for the given user (§12).
 * Verifies that the user owns the business connection.
 */
export async function getMessageVersions(messageId: string, userId: string): Promise<any[] | null> {
  const archiveMsg = await prisma.archiveMessage.findUnique({
    where: { id: messageId },
    include: {
      connection: true,
    },
  });

  if (archiveMsg) {
    if (archiveMsg.connection?.userId !== userId) return null;
    const history = Array.isArray(archiveMsg.editHistory) ? (archiveMsg.editHistory as any[]) : [];
    return [
      ...history.map((h, i) => ({
        id: `${archiveMsg.id}_v${i}`,
        messageId: archiveMsg.id,
        version: i + 1,
        text: h.text,
        caption: h.caption,
        editedAt: h.editedAt,
        createdAt: h.editedAt,
      })),
      {
        id: `${archiveMsg.id}_current`,
        messageId: archiveMsg.id,
        version: history.length + 1,
        text: archiveMsg.text,
        caption: archiveMsg.caption,
        editedAt: archiveMsg.editedAt,
        createdAt: archiveMsg.editedAt || archiveMsg.createdAt,
      },
    ];
  }

  // Fallback to legacy Message and MessageVersion if present
  try {
    const legacyMsg = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        chat: { include: { connection: true } },
        versions: { orderBy: { version: 'asc' } },
      },
    });
    if (legacyMsg) {
      if (legacyMsg.chat?.connection?.userId !== userId) return null;
      return legacyMsg.versions;
    }
  } catch {
    // legacy tables might not exist
  }

  return null;
}
