import { requireAuth } from '@/lib/auth/session';
import { apiSuccess, apiError } from '@/lib/api-helpers';
import { prisma } from '@/lib/db';
import { deleteUserArchive, deleteUserAccount } from '@/lib/services/retention-service';
import { RetentionPeriod } from '@prisma/client';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await requireAuth();
    let privacy = await prisma.privacySettings.findUnique({ where: { userId: user.id } });
    if (!privacy) {
      privacy = await prisma.privacySettings.create({
        data: { userId: user.id, retention: 'FOREVER' },
      });
    }
    return apiSuccess(privacy);
  } catch (error: any) {
    return apiError(error.message || 'Ошибка сервера', error.status || 500);
  }
}

const privacySchema = z.object({
  retention: z.nativeEnum(RetentionPeriod),
});

export async function PUT(req: Request) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const parsed = privacySchema.safeParse(body);
    if (!parsed.success) {
      return apiError('Неверный период хранения данных', 400);
    }

    const privacy = await prisma.privacySettings.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        retention: parsed.data.retention,
      },
      update: {
        retention: parsed.data.retention,
      },
    });

    return apiSuccess(privacy);
  } catch (error: any) {
    return apiError(error.message || 'Ошибка сервера', error.status || 500);
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    if (action === 'archive') {
      await deleteUserArchive(user.id);
      return apiSuccess({ message: 'Архив сообщений успешно очищен' });
    }

    if (action === 'connection') {
      await prisma.businessConnection.updateMany({
        where: { userId: user.id },
        data: {
          status: 'DISCONNECTED',
          isEnabled: false,
          disconnectedAt: new Date(),
        },
      });
      return apiSuccess({ message: 'Подключение отключено' });
    }

    if (action === 'account') {
      await deleteUserAccount(user.id);
      return apiSuccess({ message: 'Аккаунт и все связанные данные полностью удалены' });
    }

    return apiError('Неизвестное действие', 400);
  } catch (error: any) {
    return apiError(error.message || 'Ошибка сервера', error.status || 500);
  }
}
