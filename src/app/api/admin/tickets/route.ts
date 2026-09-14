import { requireAdmin } from '@/lib/auth/session';
import { apiSuccess, apiError } from '@/lib/api-helpers';
import { prisma } from '@/lib/db';
import { TicketStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const cursor = searchParams.get('cursor') ?? undefined;

    const where = statusParam ? { status: statusParam as TicketStatus } : {};

    const tickets = await prisma.supportTicket.findMany({
      where,
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { username: true, firstName: true } },
        messages: { take: 1, orderBy: { createdAt: 'desc' } },
      },
    });

    let nextCursor = null;
    if (tickets.length > limit) {
      const nextItem = tickets.pop();
      nextCursor = nextItem?.id;
    }

    return apiSuccess({ tickets, nextCursor });
  } catch (error: any) {
    return apiError(error.message || 'Ошибка сервера', error.status || 500);
  }
}
