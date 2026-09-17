import { prisma } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-helpers';
import { validateInitData } from '@/lib/auth/telegram';
import { createSession } from '@/lib/auth/session';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const schema = z.object({ initData: z.string() });

function serializeBigInt(obj: any): any {
  return JSON.parse(JSON.stringify(obj, (_, v) => (typeof v === 'bigint' ? v.toString() : v)));
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return apiError('Неверные данные', 400);

    const initData = validateInitData(parsed.data.initData);
    if (!initData || !initData.user) {
      return apiError('Неверная подпись Telegram или отсутствуют данные пользователя', 401);
    }

    const tgUser = initData.user;
    const adminTelegramId = process.env.ADMIN_TELEGRAM_ID;
    const isAdmin = Boolean(adminTelegramId && String(tgUser.id) === adminTelegramId.trim());
    const telegramPremium = typeof tgUser.is_premium === 'boolean' ? tgUser.is_premium : null;

    const user = await prisma.user.upsert({
      where: { telegramId: BigInt(tgUser.id) },
      update: {
        firstName: tgUser.first_name,
        lastName: tgUser.last_name || null,
        username: tgUser.username || null,
        languageCode: tgUser.language_code || 'ru',
        photoUrl: tgUser.photo_url || null,
        isPremium: tgUser.is_premium || false,
        ...(telegramPremium !== null ? { telegramPremium } : {}),
        isAdmin: isAdmin,
        lastLoginAt: new Date(),
      },
      create: {
        telegramId: BigInt(tgUser.id),
        firstName: tgUser.first_name,
        lastName: tgUser.last_name || null,
        username: tgUser.username || null,
        languageCode: tgUser.language_code || 'ru',
        photoUrl: tgUser.photo_url || null,
        isPremium: tgUser.is_premium || false,
        telegramPremium: telegramPremium,
        isAdmin: isAdmin,
        settings: { create: {} },
        privacySettings: { create: {} },
      },
      include: { settings: true, privacySettings: true },
    });

    await createSession(user);
    return apiSuccess({ user: serializeBigInt(user) });
  } catch (error: any) {
    console.error('Auth error:', error);
    return apiError(error.message || 'Ошибка сервера', 500);
  }
}
