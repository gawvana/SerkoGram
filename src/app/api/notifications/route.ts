import { requireAuth } from '@/lib/auth/session';
import { apiSuccess, apiError } from '@/lib/api-helpers';
import { ownerNotificationService } from '@/lib/services/owner-notification-service';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

function serializeBigInt(obj: any): any {
  return JSON.parse(
    JSON.stringify(obj, (_, v) => (typeof v === 'bigint' ? v.toString() : v))
  );
}

export async function GET(req: Request) {
  try {
    const user = await requireAuth();
    const url = new URL(req.url);
    const unreadOnly = url.searchParams.get('unreadOnly') === 'true';
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);

    const result = await ownerNotificationService.getOwnerNotifications(user.id, {
      unreadOnly,
      limit: isNaN(limit) ? 50 : Math.min(limit, 100),
    });

    return apiSuccess(serializeBigInt(result));
  } catch (error: any) {
    return apiError(error.message || 'Ошибка сервера', error.status || 500);
  }
}

const markReadSchema = z.object({
  ids: z.array(z.string()).optional(),
});

export async function PUT(req: Request) {
  try {
    const user = await requireAuth();
    let ids: string[] | undefined = undefined;

    try {
      const body = await req.json();
      const parsed = markReadSchema.safeParse(body);
      if (parsed.success) {
        ids = parsed.data.ids;
      }
    } catch {
      // Empty body is valid (marks all as read)
    }

    const updatedCount = await ownerNotificationService.markNotificationsAsRead(
      user.id,
      ids
    );

    return apiSuccess({ success: true, updatedCount });
  } catch (error: any) {
    return apiError(error.message || 'Ошибка сервера', error.status || 500);
  }
}
