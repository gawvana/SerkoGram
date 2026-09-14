// ============================================================
// SerkoGram — Retention Service
// Enforces data retention policies
// ============================================================

import { prisma } from '@/lib/db';
import type { RetentionPeriod } from '@prisma/client';

const RETENTION_MS: Record<RetentionPeriod, number | null> = {
  DAYS_7: 7 * 24 * 60 * 60 * 1000,
  DAYS_30: 30 * 24 * 60 * 60 * 1000,
  DAYS_90: 90 * 24 * 60 * 60 * 1000,
  YEAR_1: 365 * 24 * 60 * 60 * 1000,
  FOREVER: null,
};

/**
 * Clean up messages older than the user's retention period.
 */
export async function enforceRetention(userId: string): Promise<number> {
  const settings = await prisma.privacySettings.findUnique({
    where: { userId },
  });

  if (!settings || settings.retention === 'FOREVER') return 0;

  const maxAge = RETENTION_MS[settings.retention];
  if (!maxAge) return 0;

  const cutoff = new Date(Date.now() - maxAge);

  // Get all user's connections
  const connections = await prisma.businessConnection.findMany({
    where: { userId },
    select: { id: true },
  });
  const connectionIds = connections.map((c) => c.id);

  if (connectionIds.length === 0) return 0;

  // Delete old messages
  const result = await prisma.message.deleteMany({
    where: {
      chat: { connectionId: { in: connectionIds } },
      createdAt: { lt: cutoff },
    },
  });

  return result.count;
}

/**
 * Delete all archive data for a user.
 */
export async function deleteUserArchive(userId: string): Promise<void> {
  const connections = await prisma.businessConnection.findMany({
    where: { userId },
    select: { id: true },
  });
  const connectionIds = connections.map((c) => c.id);

  if (connectionIds.length === 0) return;

  // Delete all messages (cascade handles versions, media, deletions)
  await prisma.message.deleteMany({
    where: { chat: { connectionId: { in: connectionIds } } },
  });

  // Reset chat counters
  await prisma.chat.updateMany({
    where: { connectionId: { in: connectionIds } },
    data: {
      totalMessages: 0,
      deletedMessages: 0,
      editedMessages: 0,
      mediaCount: 0,
      lastMessageAt: null,
      lastMessagePreview: null,
    },
  });
}

/**
 * Delete all user data (complete account deletion).
 */
export async function deleteUserAccount(userId: string): Promise<void> {
  // Prisma cascades will handle related records
  await prisma.user.delete({
    where: { id: userId },
  });
}
