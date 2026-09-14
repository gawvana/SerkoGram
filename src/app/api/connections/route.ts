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
    const connections = await prisma.businessConnection.findMany({
      where: { userId: user.id },
      include: {
        _count: {
          select: { chats: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return apiSuccess({ connections: serializeBigInt(connections) });
  } catch (error: any) {
    return apiError(error.message || 'Ошибка сервера', error.status || 500);
  }
}
