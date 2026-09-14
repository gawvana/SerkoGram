import { requireAuth } from '@/lib/auth/session';
import { apiSuccess, apiError } from '@/lib/api-helpers';
import { getMessageVersions } from '@/lib/services/message-service';

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

    const versions = await getMessageVersions(resolvedParams.id, user.id);
    if (!versions) {
      return apiError('Сообщение не найдено или доступ запрещён', 404);
    }

    return apiSuccess(serializeBigInt(versions));
  } catch (error: any) {
    return apiError(error.message || 'Ошибка сервера', error.status || 500);
  }
}
