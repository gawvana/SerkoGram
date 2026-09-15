import { requireAdmin } from '@/lib/auth/session';
import { apiSuccess, apiError } from '@/lib/api-helpers';
import { getBot } from '@/lib/telegram/bot';
import { prisma } from '@/lib/db';
import { getBusinessRights, getRealTelegramBusinessConnection } from '@/lib/services/connection-service';

export const dynamic = 'force-dynamic';

function serializeBigInt(obj: any): any {
  return JSON.parse(JSON.stringify(obj, (_, v) => (typeof v === 'bigint' ? v.toString() : v)));
}

export async function GET(req: Request) {
  try {
    // Check admin session or secret header
    const authHeader = req.headers.get('x-admin-token');
    const expectedSecret = process.env.ADMIN_SECRET_TOKEN || process.env.SESSION_SECRET;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const isHeaderAuthorized = Boolean(
      (authHeader && expectedSecret && authHeader === expectedSecret) ||
      (authHeader && botToken && authHeader === botToken)
    );

    if (!isHeaderAuthorized) {
      await requireAdmin();
    }

    const bot = getBot();
    let botOk = false;
    let botInfo: any = null;
    let webhookOk = false;
    let webhookInfo: any = null;
    let lastError: string | null = null;

    try {
      const me = await bot.api.getMe();
      botOk = true;
      botInfo = {
        id: me.id,
        username: me.username,
        firstName: me.first_name,
        canJoinGroups: me.can_join_groups,
        canReadAllGroupMessages: me.can_read_all_group_messages,
      };
    } catch (err: any) {
      lastError = err?.description || err?.message || 'Failed to get bot info';
    }

    try {
      const wh = await bot.api.getWebhookInfo();
      webhookOk = true;
      webhookInfo = {
        url: wh.url,
        hasCustomCertificate: wh.has_custom_certificate,
        pendingUpdateCount: wh.pending_update_count,
        lastErrorDate: wh.last_error_date ? new Date(wh.last_error_date * 1000).toISOString() : null,
        lastErrorMessage: wh.last_error_message || null,
        maxConnections: wh.max_connections,
        allowedUpdates: wh.allowed_updates || [],
      };
    } catch (err: any) {
      if (!lastError) lastError = err?.description || err?.message;
    }

    // Connections and rights
    const connections = await prisma.businessConnection.findMany({
      where: { status: 'ACTIVE' },
      include: {
        user: {
          select: {
            id: true,
            telegramId: true,
            firstName: true,
            username: true,
          },
        },
      },
      take: 20,
    });

    const detailedConnections = await Promise.all(
      connections.map(async (c) => {
        const rights = await getBusinessRights(c.id, c.telegramConnectionId);
        const real = await getRealTelegramBusinessConnection(c.telegramConnectionId);
        return {
          id: c.id,
          telegramConnectionId: c.telegramConnectionId,
          user: c.user,
          canReply: rights.canReply,
          isEnabled: rights.isEnabled,
          realState: real
            ? {
                canReply: real.can_reply,
                isEnabled: real.is_enabled,
                date: new Date(real.date * 1000).toISOString(),
              }
            : null,
        };
      })
    );

    return apiSuccess({
      status: botOk && webhookOk ? 'healthy' : 'degraded',
      bot_ok: botOk,
      bot: botInfo,
      webhook_ok: webhookOk,
      webhook: webhookInfo,
      business_mode_ok: detailedConnections.some((c) => c.isEnabled && c.canReply),
      active_connections_count: connections.length,
      connections: serializeBigInt(detailedConnections),
      last_error: lastError,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return apiError(error.message || 'Ошибка сервера', error.status || 500);
  }
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('x-admin-token');
    const expectedSecret = process.env.ADMIN_SECRET_TOKEN || process.env.SESSION_SECRET;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const isHeaderAuthorized = Boolean(
      (authHeader && expectedSecret && authHeader === expectedSecret) ||
      (authHeader && botToken && authHeader === botToken)
    );

    if (!isHeaderAuthorized) {
      await requireAdmin();
    }

    const bot = getBot();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://serkogram.vercel.app';
    const webhookUrl = `${appUrl}/api/telegram/webhook`;
    const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET;

    await bot.api.setWebhook(webhookUrl, {
      secret_token: secretToken || undefined,
      allowed_updates: [
        'message',
        'callback_query',
        'business_connection',
        'business_message',
        'edited_business_message',
        'deleted_business_messages',
      ],
      drop_pending_updates: false,
    });

    const info = await bot.api.getWebhookInfo();

    return apiSuccess({
      message: 'Webhook успешно синхронизирован с Telegram Bot API',
      webhook: info,
      secret_token_configured: Boolean(secretToken),
    });
  } catch (error: any) {
    return apiError(error.message || 'Ошибка настройки вебхука', error.status || 500);
  }
}
