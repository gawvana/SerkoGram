import { requireAuth } from '@/lib/auth/session';
import { apiError, apiSuccess } from '@/lib/api-helpers';
import { getSecureMediaUrl } from '@/lib/services/media-service';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const resolvedParams = await params;

    const url = await getSecureMediaUrl(resolvedParams.id, user.id);
    if (!url) {
      return apiError('Медиафайл не найден или доступ ограничен', 404);
    }

    const { searchParams } = new URL(req.url);
    if (searchParams.get('json') === 'true') {
      return apiSuccess({ url });
    }

    return NextResponse.redirect(url);
  } catch (error: any) {
    return apiError(error.message || 'Ошибка сервера', error.status || 500);
  }
}
