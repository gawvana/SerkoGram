// ============================================================
// SerkoGram — Grammy Bot Instance & Telegram Bot API Integration
// Encoded strictly per Telegram Bot API 10.3 Chat Automation Spec
// ============================================================

import { Bot } from 'grammy';
import crypto from 'crypto';

let botInstance: Bot | null = null;

/**
 * Get or create the Grammy bot singleton.
 * Throws if TELEGRAM_BOT_TOKEN is not set.
 */
export function getBot(): Bot {
  if (botInstance) return botInstance;

  const token = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN environment variable is not set');
  }

  botInstance = new Bot(token);
  return botInstance;
}

/**
 * Reset the bot singleton (used in tests).
 */
export function resetBotInstance(): void {
  botInstance = null;
}

/**
 * Canonical list of allowed updates required for SerkoGram Chat Automation.
 * Explicitly includes business_* updates to avoid silent omission under default settings.
 */
export const REQUIRED_ALLOWED_UPDATES = [
  'business_connection',
  'business_message',
  'edited_business_message',
  'deleted_business_messages',
  'message',
  'callback_query',
] as const;

/**
 * Verify the webhook secret token header using constant-time comparison.
 * Must match X-Telegram-Bot-Api-Secret-Token sent by Telegram.
 */
export function verifyWebhookSecret(request: Request): boolean {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET || process.env.WEBHOOK_SECRET;

  // In production, an unconfigured secret is a fatal misconfiguration
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[WebhookSecurity] TELEGRAM_WEBHOOK_SECRET is not configured in production environment! Rejecting webhook.');
      return false;
    }
    // Allow unconfigured secret only in development/test if explicitly not provided
    return true;
  }

  const headerSecret = request.headers.get('x-telegram-bot-api-secret-token');
  if (!headerSecret) {
    return false;
  }

  const secretBuf = Buffer.from(secret, 'utf8');
  const headerBuf = Buffer.from(headerSecret, 'utf8');
  if (secretBuf.length !== headerBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(secretBuf, headerBuf);
}

export interface BotPreflightResult {
  canConnectToBusiness: boolean;
  username: string;
  id: number;
  error?: string;
}

/**
 * Pre-flight / startup capability check (§1).
 * Verifies that the bot has can_connect_to_business: true in getMe response.
 */
export async function checkBotBusinessCapability(): Promise<BotPreflightResult> {
  try {
    const bot = getBot();
    const me = await bot.api.getMe();
    const canConnect = Boolean((me as any).can_connect_to_business);

    if (!canConnect) {
      console.error(
        '[BotPreflight] CRITICAL: Bot does not have can_connect_to_business: true in getMe. ' +
        'Chat Automation / Business Connections will NOT function until enabled in @BotFather (Bot Settings -> Chat Automation / Business Bots)!'
      );
    }

    return {
      canConnectToBusiness: canConnect,
      username: me.username || '',
      id: me.id,
    };
  } catch (err: any) {
    console.error('[BotPreflight] Error verifying bot capabilities via getMe:', err?.message || err);
    return {
      canConnectToBusiness: false,
      username: '',
      id: 0,
      error: err?.message || 'Failed to call getMe',
    };
  }
}
