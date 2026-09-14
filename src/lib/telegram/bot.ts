// ============================================================
// SerkoGram — Grammy Bot Instance
// ============================================================

import { Bot } from 'grammy';

let botInstance: Bot | null = null;

/**
 * Get or create the Grammy bot singleton.
 * Throws if TELEGRAM_BOT_TOKEN is not set.
 */
export function getBot(): Bot {
  if (botInstance) return botInstance;

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN environment variable is not set');
  }

  botInstance = new Bot(token);
  return botInstance;
}

/**
 * Verify the webhook secret token header.
 */
export function verifyWebhookSecret(request: Request): boolean {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret) return true; // No secret configured — skip check

  const headerSecret = request.headers.get('x-telegram-bot-api-secret-token');
  return headerSecret === secret;
}
