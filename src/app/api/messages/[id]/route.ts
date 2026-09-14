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
    const id = resolvedParams.id;

    const message = await prisma.message.findFirst({
      where: { id, chat: { connection: { userId: user.id } } },
      include: { media: true, _count: { select: { versions: true } } },
    });

    if (!message) return apiError('Сообщение не найдено', 404);

    return apiSuccess({ message: serializeBigInt(message) });
  } catch (error: any) {
    return apiError(error.message || 'Ошибка сервера', error.status || 500);
  }
}
