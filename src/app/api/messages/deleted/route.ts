import { requireAuth } from '@/lib/auth/session';
import { apiSuccess, apiError } from '@/lib/api-helpers';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

function serializeBigInt(obj: any): any {
  return JSON.parse(JSON.stringify(obj, (_, v) => (typeof v === 'bigint' ? v.toString() : v)));
}

export async function GET(req: Request) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const cursor = searchParams.get('cursor');

    const messages = await prisma.message.findMany({
      where: {
        chat: { connection: { userId: user.id } },
        isDeleted: true,
      },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { deletedAt: 'desc' },
      include: { chat: true, media: true },
    });

    let nextCursor = null;
    let items = messages;
    if (messages.length > limit) {
      items = messages.slice(0, limit);
      nextCursor = items[items.length - 1]?.id;
    }

    const serialized = serializeBigInt(items);
    return apiSuccess({ items: serialized, messages: serialized, nextCursor });
  } catch (error: any) {
    return apiError(error.message || 'Ошибка сервера', error.status || 500);
  }
}
