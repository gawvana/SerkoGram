import { requireAuth } from '@/lib/auth/session';
import { apiSuccess, apiError } from '@/lib/api-helpers';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

function serializeBigInt(obj: any): any {
  return JSON.parse(JSON.stringify(obj, (_, v) => (typeof v === 'bigint' ? v.toString() : v)));
}

export async function GET() {
  try {
    const user = await requireAuth();
    const connection = await prisma.businessConnection.findFirst({
      where: { userId: user.id, type: 'BUSINESS' },
      include: {
        _count: {
          select: { chats: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return apiSuccess({ connection: serializeBigInt(connection) });
  } catch (error: any) {
    return apiError(error.message || 'Ошибка сервера', error.status || 500);
  }
}

export async function DELETE() {
  try {
    const user = await requireAuth();
    await prisma.businessConnection.updateMany({
      where: { userId: user.id, type: 'BUSINESS' },
      data: {
        status: 'DISCONNECTED',
        isEnabled: false,
        disconnectedAt: new Date(),
      },
    });
    return apiSuccess({ success: true, message: 'Бизнес-соединение отключено' });
  } catch (error: any) {
    return apiError(error.message || 'Ошибка сервера', error.status || 500);
  }
}
