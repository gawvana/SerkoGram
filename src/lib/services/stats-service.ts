// ============================================================
// SerkoGram — Stats Service
// Aggregates dashboard statistics for a user
// ============================================================

import { prisma } from '@/lib/db';
import type { DashboardStats, ActivityDataPoint } from '@/lib/types';

/**
 * Get aggregate stats for all user's connections
 */
export async function getUserStats(userId: string): Promise<DashboardStats> {
  // Get all connection IDs for this user
  const connections = await prisma.businessConnection.findMany({
    where: { userId },
    select: { id: true },
  });

  const connectionIds = connections.map((c) => c.id);

  if (connectionIds.length === 0) {
    return {
      totalMessages: 0,
      receivedMessages: 0,
      sentMessages: 0,
      deletedMessages: 0,
      editedMessages: 0,
      mediaCount: 0,
    };
  }

  // Aggregate from chats
  const chatAgg = await prisma.chat.aggregate({
    where: { connectionId: { in: connectionIds } },
    _sum: {
      totalMessages: true,
      deletedMessages: true,
      editedMessages: true,
      mediaCount: true,
    },
  });

  const totalMessages = chatAgg._sum.totalMessages ?? 0;
  const deletedMessages = chatAgg._sum.deletedMessages ?? 0;
  const editedMessages = chatAgg._sum.editedMessages ?? 0;
  const mediaCount = chatAgg._sum.mediaCount ?? 0;

  // Count sent vs received
  const sentCount = await prisma.message.count({
    where: {
      chat: { connectionId: { in: connectionIds } },
      isOutgoing: true,
    },
  });

  const receivedCount = totalMessages - sentCount;

  return {
    totalMessages,
    receivedMessages: receivedCount,
    sentMessages: sentCount,
    deletedMessages,
    editedMessages,
    mediaCount,
  };
}

/**
 * Get activity data points for the last N days
 */
export async function getActivityData(
  userId: string,
  days = 30
): Promise<ActivityDataPoint[]> {
  const connections = await prisma.businessConnection.findMany({
    where: { userId },
    select: { id: true },
  });

  const connectionIds = connections.map((c) => c.id);
  const since = new Date();
  since.setDate(since.getDate() - days);

  const messages = await prisma.message.groupBy({
    by: ['telegramDate'],
    where: {
      chat: { connectionId: { in: connectionIds } },
      telegramDate: { gte: since },
    },
    _count: true,
  });

  // Group by date string
  const dateMap = new Map<string, number>();

  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    dateMap.set(key, 0);
  }

  for (const row of messages) {
    const key = new Date(row.telegramDate).toISOString().split('T')[0];
    dateMap.set(key, (dateMap.get(key) ?? 0) + row._count);
  }

  return Array.from(dateMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
