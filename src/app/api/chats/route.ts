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
    const q = searchParams.get('q') || searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '30', 10);
    const cursor = searchParams.get('cursor');

    const chats = await prisma.chat.findMany({
      where: {
        connection: { userId: user.id },
        ...(q ? { title: { contains: q, mode: 'insensitive' } } : {}),
      },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { lastMessageAt: 'desc' },
      include: {
        messages: {
          take: 1,
          orderBy: { telegramDate: 'desc' },
        },
      },
    });

    let nextCursor = null;
    let items = chats;
    if (chats.length > limit) {
      items = chats.slice(0, limit);
      nextCursor = items[items.length - 1]?.id;
    }

    const serialized = serializeBigInt(items);

    return apiSuccess({ items: serialized, chats: serialized, nextCursor });
  } catch (error: any) {
    return apiError(error.message || 'Ошибка сервера', error.status || 500);
  }
}
