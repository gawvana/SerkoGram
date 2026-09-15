// ============================================================
// SerkoGram — Telegram initData HMAC-SHA256 Validation
// Official algorithm: https://core.telegram.org/bots/webapps#validating-data
// ============================================================

import crypto from 'crypto';
import type { TelegramUser, TelegramInitData } from '@/lib/types';
import { INIT_DATA_MAX_AGE } from '@/lib/constants';

/**
 * Validates Telegram Mini App initData using HMAC-SHA256.
 *
 * Algorithm:
 * 1. Parse the query string
 * 2. Sort all key=value pairs alphabetically by key (excluding "hash")
 * 3. Create data_check_string by joining them with \n
 * 4. Create secret_key = HMAC-SHA256("WebAppData", bot_token)
 * 5. Compute hash = HMAC-SHA256(secret_key, data_check_string)
 * 6. Compare computed hash with the provided hash
 */
export function validateInitData(initDataStr: string): TelegramInitData | null {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.error('[Auth] TELEGRAM_BOT_TOKEN is not configured');
    return null;
  }

  try {
    const params = new URLSearchParams(initDataStr);
    const hash = params.get('hash');

    if (!hash) {
      return null;
    }

    // Build data_check_string: sort params by key, exclude "hash"
    const dataCheckPairs: string[] = [];
    params.forEach((value, key) => {
      if (key !== 'hash') {
        dataCheckPairs.push(`${key}=${value}`);
      }
    });
    dataCheckPairs.sort();
    const dataCheckString = dataCheckPairs.join('\n');

    // secret_key = HMAC-SHA256("WebAppData", bot_token)
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    // computed_hash = HMAC-SHA256(secret_key, data_check_string)
    const computedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    // Constant-time comparison
    const compBuf = Buffer.from(computedHash, 'utf8');
    const hashBuf = Buffer.from(hash, 'utf8');
    if (compBuf.length !== hashBuf.length || !crypto.timingSafeEqual(compBuf, hashBuf)) {
      return null;
    }

    // Check auth_date expiration
    const authDateStr = params.get('auth_date');
    if (!authDateStr) {
      return null;
    }

    const authDate = parseInt(authDateStr, 10);
    const now = Math.floor(Date.now() / 1000);

    if (now - authDate > INIT_DATA_MAX_AGE) {
      return null;
    }

    // Parse user data
    const userStr = params.get('user');
    let user: TelegramUser | undefined;

    if (userStr) {
      try {
        user = JSON.parse(userStr) as TelegramUser;
      } catch {
        return null;
      }
    }

    return {
      query_id: params.get('query_id') ?? undefined,
      user,
      auth_date: authDate,
      hash,
    };
  } catch (error) {
    console.error('[Auth] initData validation error:', error);
    return null;
  }
}

/**
 * Extract Telegram user from validated initData
 */
export function extractTelegramUser(initData: TelegramInitData): TelegramUser | null {
  return initData.user ?? null;
}
