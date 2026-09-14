import { requireAuth } from '@/lib/auth/session';
import { apiSuccess, apiError } from '@/lib/api-helpers';
import { createTicket, getUserTickets } from '@/lib/services/support-service';
import { TicketCategory } from '@prisma/client';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const cursor = searchParams.get('cursor') ?? undefined;

    const data = await getUserTickets(user.id, cursor, limit);
    return apiSuccess(data);
  } catch (error: any) {
    return apiError(error.message || 'Ошибка сервера', error.status || 500);
  }
}

const ticketSchema = z.object({
  category: z.nativeEnum(TicketCategory),
  subject: z.string().min(3).max(200),
  message: z.string().min(5).max(5000),
});

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const parsed = ticketSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('Некорректные данные обращения', 400);
    }

    const ticket = await createTicket(
      user.id,
      parsed.data.category,
      parsed.data.subject,
      parsed.data.message
    );

    return apiSuccess(ticket);
  } catch (error: any) {
    return apiError(error.message || 'Ошибка сервера', error.status || 500);
  }
}
