import { requireAuth } from '@/lib/auth/session';
import { apiSuccess, apiError } from '@/lib/api-helpers';
import { prisma } from '@/lib/db';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await requireAuth();
    let settings = await prisma.userSettings.findUnique({ where: { userId: user.id } });
    if (!settings) {
      settings = await prisma.userSettings.create({
        data: { userId: user.id },
      });
    }
    return apiSuccess(settings);
  } catch (error: any) {
    return apiError(error.message || 'Ошибка сервера', error.status || 500);
  }
}

const settingsSchema = z.object({
  autoSaveEnabled: z.boolean().optional(),
  saveMessages: z.boolean().optional(),
  saveMedia: z.boolean().optional(),
  saveEdits: z.boolean().optional(),
  saveDeleted: z.boolean().optional(),
  notificationsOn: z.boolean().optional(),
});

export async function PUT(req: Request) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const parsed = settingsSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('Неверные параметры настроек', 400);
    }

    const settings = await prisma.userSettings.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        ...parsed.data,
      },
      update: parsed.data,
    });

    return apiSuccess(settings);
  } catch (error: any) {
    return apiError(error.message || 'Ошибка сервера', error.status || 500);
  }
}
