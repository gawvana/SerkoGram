import { requireAuth } from '@/lib/auth/session';
import { apiSuccess, apiError } from '@/lib/api-helpers';
import { prisma } from '@/lib/db';
import type { AccountConnectionState, ConnectionPermissions, PremiumState, ConnectionMode } from '@/lib/types';

export const dynamic = 'force-dynamic';

function serializeBigInt(obj: any): any {
  return JSON.parse(JSON.stringify(obj, (_, v) => (typeof v === 'bigint' ? v.toString() : v)));
}

export async function GET() {
  try {
    const user = await requireAuth();
    const connections = await prisma.businessConnection.findMany({
      where: { userId: user.id },
      include: {
        _count: {
          select: { chats: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const activeConnection = connections.find((c) => c.status === 'ACTIVE' && c.isEnabled) || connections[0] || null;

    // Detect authoritative premium state
    // 1. Authoritative Telegram Business connection user state (highest priority)
    // 2. User record state
    // 3. Fallback to unknown without guessing
    let premiumState: PremiumState = 'PREMIUM_UNKNOWN';
    if (activeConnection?.telegramPremium === true || (user as any).telegramPremium === true) {
      premiumState = 'PREMIUM_TRUE';
    } else if (activeConnection?.telegramPremium === false || (user as any).telegramPremium === false) {
      premiumState = 'PREMIUM_FALSE';
    } else if (typeof user.isPremium === 'boolean' && user.isPremium) {
      premiumState = 'PREMIUM_TRUE';
    }

    const connectionMode: ConnectionMode =
      ((activeConnection as any)?.connectionMode as ConnectionMode) ||
      (premiumState === 'PREMIUM_TRUE' ? 'PREMIUM_BUSINESS' : 'AUTOMATION_CHAT');

    const status: 'ACTIVE' | 'WAITING' | 'DISCONNECTED' | 'ERROR' = activeConnection
      ? (activeConnection.status === 'ACTIVE' && activeConnection.isEnabled
          ? 'ACTIVE'
          : activeConnection.status === 'ERROR'
          ? 'ERROR'
          : activeConnection.isEnabled
          ? 'WAITING'
          : 'DISCONNECTED')
      : 'WAITING';

    const permissions: ConnectionPermissions = {
      can_read_messages: (activeConnection as any)?.canReadMessages ?? true,
      can_reply: activeConnection?.canReply ?? false,
      can_delete_sent_messages: (activeConnection as any)?.canDeleteSentMessages ?? true,
      can_delete_all_messages: (activeConnection as any)?.canDeleteAllMessages ?? false,
    };

    const accountState: AccountConnectionState = {
      premium: premiumState,
      mode: connectionMode,
      status: status,
      connectionId: activeConnection?.telegramConnectionId || activeConnection?.id || null,
      permissions,
    };

    const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'SerkoGram_bot';

    return apiSuccess({
      connections: serializeBigInt(connections),
      connection: serializeBigInt(activeConnection),
      user: serializeBigInt(user),
      accountState,
      botUsername,
      connectUrls: {
        bot: `https://t.me/${botUsername}`,
        businessSettings: 'tg://settings/business',
        automationChat: `https://t.me/${botUsername}?start=connect_automation`,
        premiumBusiness: `https://t.me/${botUsername}?start=connect_business`,
      },
    });
  } catch (error: any) {
    return apiError(error.message || 'Ошибка сервера', error.status || 500);
  }
}
