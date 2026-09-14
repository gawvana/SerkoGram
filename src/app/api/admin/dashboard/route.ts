import { requireAdmin } from '@/lib/auth/session';
import { apiSuccess, apiError } from '@/lib/api-helpers';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

function serializeBigInt(obj: any): any {
  return JSON.parse(JSON.stringify(obj, (_, v) => (typeof v === 'bigint' ? v.toString() : v)));
}

export async function GET() {
  try {
    await requireAdmin();
    const [totalUsers, totalMessages, activeConnections, totalMedia, openTickets, recentAuditLogs] =
      await Promise.all([
        prisma.user.count(),
        prisma.message.count(),
        prisma.businessConnection.count({ where: { status: 'ACTIVE' } }),
        prisma.messageMedia.count(),
        prisma.supportTicket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
        prisma.auditLog.count(),
      ]);

    return apiSuccess({
      stats: serializeBigInt({
        totalUsers,
        totalMessages,
        activeConnections,
        totalMedia,
        openTickets,
        recentAuditLogs,
      }),
      system: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      },
    });
  } catch (error: any) {
    return apiError(error.message || 'Ошибка сервера', error.status || 500);
  }
}
