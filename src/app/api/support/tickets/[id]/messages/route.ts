import { requireAuth } from '@/lib/auth/session';
import { apiSuccess, apiError } from '@/lib/api-helpers';
import { getTicketDetail, addTicketMessage } from '@/lib/services/support-service';
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

    return apiSuccess(ticket.messages);
  } catch (error: any) {
    return apiError(error.message || 'Ошибка сервера', error.status || 500);
  }
}

const msgSchema = z.object({
  text: z.string().min(1).max(5000),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const resolvedParams = await params;
    const body = await req.json();
    const parsed = msgSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('Текст сообщения не может быть пустым', 400);
    }

    const message = await addTicketMessage(
      resolvedParams.id,
      user.id,
      parsed.data.text,
      user.isAdmin
    );

    if (!message) {
      return apiError('Тикет не найден', 404);
    }

    return apiSuccess(message);
  } catch (error: any) {
    return apiError(error.message || 'Ошибка сервера', error.status || 500);
  }
}
