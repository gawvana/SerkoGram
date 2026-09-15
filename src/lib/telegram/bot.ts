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

import crypto from 'crypto';

/**
 * Verify the webhook secret token header using constant-time comparison.
 */
export function verifyWebhookSecret(request: Request): boolean {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret) return true; // No secret configured — skip check

  const headerSecret = request.headers.get('x-telegram-bot-api-secret-token');
  if (!headerSecret) return false;

  const secretBuf = Buffer.from(secret, 'utf8');
  const headerBuf = Buffer.from(headerSecret, 'utf8');
  if (secretBuf.length !== headerBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(secretBuf, headerBuf);
}
