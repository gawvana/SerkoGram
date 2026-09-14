import { requireAuth, requireAdmin } from '@/lib/auth/session';
import { apiSuccess, apiError } from '@/lib/api-helpers';
import { getTicketDetail, updateTicketStatus } from '@/lib/services/support-service';
import { TicketStatus } from '@prisma/client';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const resolvedParams = await params;
    const ticket = await getTicketDetail(resolvedParams.id, user.id);

    if (!ticket) {
      return apiError('Тикет не найден', 404);
    }
    return apiSuccess(ticket);
  } catch (error: any) {
    return apiError(error.message || 'Ошибка сервера', error.status || 500);
  }
}

const statusSchema = z.object({
  status: z.nativeEnum(TicketStatus),
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const resolvedParams = await params;
    const body = await req.json();
    const parsed = statusSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('Неверный статус тикета', 400);
    }

    const ticket = await updateTicketStatus(resolvedParams.id, parsed.data.status);
    return apiSuccess(ticket);
  } catch (error: any) {
    return apiError(error.message || 'Ошибка сервера', error.status || 500);
  }
}
