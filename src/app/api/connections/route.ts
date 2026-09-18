import { requireAuth } from '@/lib/auth/session';
import { apiSuccess, apiError } from '@/lib/api-helpers';
import { prisma } from '@/lib/db';
import {
  extractConnectionRights,
  evaluateConnectionPermissions,
  reconcileBusinessConnection,
} from '@/lib/services/connection-service';
import type { BusinessBotRights } from '@/lib/telegram/types';

export const dynamic = 'force-dynamic';

function serializeBigInt(obj: any): any {
  return JSON.parse(JSON.stringify(obj, (_, v) => (typeof v === 'bigint' ? v.toString() : v)));
}

export async function GET(req: Request) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);
    const refresh = searchParams.get('refresh') === 'true';

    let connections = await prisma.businessConnection.findMany({
      where: { userId: user.id },
      include: {
        _count: {
          select: { chats: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    let activeConnection =
      connections.find((c) => (c.status === 'CONNECTED' || (c.status as string) === 'ACTIVE') && c.isEnabled) ||
      connections[0] ||
      null;

    // On-demand reconciliation (§4, §6): if refresh is requested or stale
    if (refresh && activeConnection?.telegramConnectionId) {
      const refreshed = await reconcileBusinessConnection(activeConnection.telegramConnectionId);
      if (refreshed) {
        connections = await prisma.businessConnection.findMany({
          where: { userId: user.id },
          include: {
            _count: {
              select: { chats: true },
            },
          },
          orderBy: { updatedAt: 'desc' },
        });
        activeConnection =
          connections.find((c) => (c.status === 'CONNECTED' || (c.status as string) === 'ACTIVE') && c.isEnabled) ||
          connections[0] ||
          null;
      }
    }

    const rights: BusinessBotRights = extractConnectionRights(activeConnection);
    const permissionDetails = evaluateConnectionPermissions(activeConnection);
    const missingPermissions = permissionDetails.filter((p) => !p.granted).map((p) => p.key);

    const isConnected =
      Boolean(activeConnection) &&
      (activeConnection!.status === 'CONNECTED' || (activeConnection!.status as string) === 'ACTIVE') &&
      activeConnection!.isEnabled;

    let derivedStatus: 'CONNECTED' | 'DISCONNECTED' | 'WAITING_FOR_EVENT' | 'ERROR' = 'WAITING_FOR_EVENT';
    if (!activeConnection) {
      derivedStatus = 'WAITING_FOR_EVENT';
    } else if (activeConnection.status === 'ERROR') {
      derivedStatus = 'ERROR';
    } else if (isConnected) {
      derivedStatus = 'CONNECTED';
    } else {
      derivedStatus = 'DISCONNECTED';
    }

    const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'SerkoGram_bot';

    return apiSuccess({
      connections: serializeBigInt(connections),
      connection: serializeBigInt(activeConnection),
      user: serializeBigInt(user),
      status: derivedStatus,
      isConnected,
      rights,
      permissions: permissionDetails,
      missingPermissions,
      botUsername,
      onboardingInstructions: [
        '1. Откройте Telegram → Настройки',
        '2. Откройте Автоматизация чатов / Chat Automation',
        `3. Добавьте @${botUsername}`,
        '4. Выберите нужные чаты для доступа',
        '5. Включите необходимые разрешения',
        '6. Вернитесь в SerkoGram',
      ],
      connectUrls: {
        bot: `https://t.me/${botUsername}`,
        settings: 'tg://settings/business',
        chatAutomation: `https://t.me/${botUsername}?start=connect`,
      },
    });
  } catch (error: any) {
    return apiError(error.message || 'Ошибка сервера', error.status || 500);
  }
}
