import { requireAuth } from '@/lib/auth/session';
import { apiSuccess, apiError } from '@/lib/api-helpers';
import { searchMessages } from '@/lib/services/search-service';
import { MessageType } from '@prisma/client';

export const dynamic = 'force-dynamic';

function serializeBigInt(obj: any): any {
  return JSON.parse(JSON.stringify(obj, (_, v) => (typeof v === 'bigint' ? v.toString() : v)));
}

export async function GET(req: Request) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || searchParams.get('query') || '';
    const chatId = searchParams.get('chatId') || undefined;
    const type = searchParams.get('type') as MessageType | undefined;
    const isDeleted = searchParams.has('isDeleted') ? searchParams.get('isDeleted') === 'true' : undefined;
    const cursor = searchParams.get('cursor') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const result = await searchMessages({
      userId: user.id,
      query: q,
      chatId,
      messageType: type,
      isDeleted,
      cursor,
      limit,
    });

    return apiSuccess(serializeBigInt(result));
  } catch (error: any) {
    return apiError(error.message || 'Ошибка сервера', error.status || 500);
  }
}
