import { requireAuth } from '@/lib/auth/session';
import { apiSuccess, apiError } from '@/lib/api-helpers';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

function serializeBigInt(obj: any): any {
  return JSON.parse(JSON.stringify(obj, (_, v) => (typeof v === 'bigint' ? v.toString() : v)));
}

export async function GET(req: Request) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);
    const chatId = searchParams.get('chatId');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const cursor = searchParams.get('cursor');
    const filter = searchParams.get('filter');
    const isDeleted = searchParams.get('isDeleted') === 'true';

    if (!chatId) return apiError('chatId обязателен', 400);

    const chat = await prisma.chat.findFirst({
      where: { id: chatId, connection: { userId: user.id } },
    });

    if (!chat) return apiError('Доступ запрещен', 403);

    const where: Prisma.MessageWhereInput = { chatId };

    if (isDeleted || filter === 'deleted') {
      where.isDeleted = true;
    }
    if (filter === 'edited') {
      where.isEdited = true;
    }
    if (filter === 'media') {
      where.messageType = { in: ['PHOTO', 'VIDEO', 'VOICE', 'VIDEO_NOTE', 'DOCUMENT', 'AUDIO', 'ANIMATION', 'STICKER'] };
    }
    if (filter === 'photo') {
      where.messageType = 'PHOTO';
    }
    if (filter === 'video') {
      where.messageType = 'VIDEO';
    }
    if (filter === 'voice') {
      where.messageType = { in: ['VOICE', 'VIDEO_NOTE'] };
    }
    if (filter === 'document') {
      where.messageType = 'DOCUMENT';
    }
    if (filter === 'audio') {
      where.messageType = 'AUDIO';
    }

    const messages = await prisma.message.findMany({
      where,
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { telegramDate: 'desc' },
      include: { media: true, versions: { orderBy: { version: 'desc' } } },
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