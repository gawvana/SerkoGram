import { requireAuth } from '@/lib/auth/session';
import { apiSuccess, apiError } from '@/lib/api-helpers';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

function serializeBigInt(obj: any): any {
  return JSON.parse(JSON.stringify(obj, (_, v) => (typeof v === 'bigint' ? v.toString() : v)));
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const resolvedParams = await params;
    const chatId = resolvedParams.id;

    const isNumeric = /^-?\d+$/.test(chatId);
    const chat = await prisma.chat.findFirst({
      where: isNumeric
        ? { telegramChatId: BigInt(chatId), connection: { userId: user.id } }
        : { id: chatId, connection: { userId: user.id } },
      include: {
        members: true,
      },
    });

    if (!chat) return apiError('Чат не найден', 404);

    return apiSuccess(serializeBigInt(chat));
  } catch (error: any) {
    return apiError(error.message || 'Ошибка сервера', error.status || 500);
  }
}
