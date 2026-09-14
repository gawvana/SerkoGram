import { requireAuth } from '@/lib/auth/session';
import { apiSuccess, apiError } from '@/lib/api-helpers';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

function serializeBigInt(obj: any): any { return JSON.parse(JSON.stringify(obj, (_, v) => typeof v === 'bigint' ? v.toString() : v)); }

export async function GET() {
  try {
    const user = await requireAuth();
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { settings: true, privacySettings: true }
    });
    return apiSuccess({ user: serializeBigInt(fullUser) });
  } catch (error: any) {
    return apiError(error.message || 'Ошибка сервера', error.status || 500);
  }
}
