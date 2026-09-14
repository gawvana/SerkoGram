import { requireAuth } from '@/lib/auth/session';
import { apiSuccess, apiError } from '@/lib/api-helpers';
import { getUserStats } from '@/lib/services/stats-service';

export const dynamic = 'force-dynamic';

function serializeBigInt(obj: any): any {
  return JSON.parse(JSON.stringify(obj, (_, v) => (typeof v === 'bigint' ? v.toString() : v)));
}

export async function GET() {
  try {
    const user = await requireAuth();
    const stats = await getUserStats(user.id);
    return apiSuccess(serializeBigInt(stats));
  } catch (error: any) {
    return apiError(error.message || 'Ошибка сервера', error.status || 500);
  }
}
