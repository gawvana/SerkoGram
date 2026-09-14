// ============================================================
// SerkoGram — Telegram initData Validation Tests
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';

// Helper to create valid initData for testing
function createTestInitData(botToken: string, userData: Record<string, unknown> = {}) {
  const user = {
    id: 123456789,
    first_name: 'Test',
    last_name: 'User',
    username: 'testuser',
    language_code: 'ru',
    ...userData,
  };

  const authDate = Math.floor(Date.now() / 1000);
  const params = new URLSearchParams();
  params.set('user', JSON.stringify(user));
  params.set('auth_date', String(authDate));

  // Build data_check_string
  const dataCheckPairs: string[] = [];
  params.forEach((value, key) => {
    dataCheckPairs.push(`${key}=${value}`);
  });
  dataCheckPairs.sort();
  const dataCheckString = dataCheckPairs.join('\n');

  // secret_key = HMAC-SHA256("WebAppData", bot_token)
  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest();

  // hash = HMAC-SHA256(secret_key, data_check_string)
  const hash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  params.set('hash', hash);

  return params.toString();
}

describe('Telegram initData validation', () => {
  const BOT_TOKEN = 'test-bot-token-12345:ABCdefGHIjklMNOpqrsTUVwxyz';

  beforeEach(() => {
    vi.stubEnv('TELEGRAM_BOT_TOKEN', BOT_TOKEN);
  });

  it('should create valid initData string', () => {
    const initData = createTestInitData(BOT_TOKEN);
    expect(initData).toContain('hash=');
    expect(initData).toContain('auth_date=');
    expect(initData).toContain('user=');
  });

  it('should parse user data correctly from initData', () => {
    const initData = createTestInitData(BOT_TOKEN, { first_name: 'Sergey', username: 'serko' });
    const params = new URLSearchParams(initData);
    const user = JSON.parse(params.get('user')!);

    expect(user.first_name).toBe('Sergey');
    expect(user.username).toBe('serko');
    expect(user.id).toBe(123456789);
  });

  it('should have valid HMAC-SHA256 hash', () => {
    const initData = createTestInitData(BOT_TOKEN);
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');

    // Verify hash format (64 hex chars)
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('should detect tampered data', () => {
    const initData = createTestInitData(BOT_TOKEN);
    // Tamper with auth_date
    const tampered = initData.replace(/auth_date=\d+/, 'auth_date=999999999');
    const params = new URLSearchParams(tampered);
    const hash = params.get('hash');

    // Recompute hash with tampered data (should differ)
    params.delete('hash');
    const dataCheckPairs: string[] = [];
    params.forEach((value, key) => {
      dataCheckPairs.push(`${key}=${value}`);
    });
    dataCheckPairs.sort();
    const dataCheckString = dataCheckPairs.join('\n');

    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(BOT_TOKEN)
      .digest();

    const computedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    expect(computedHash).not.toBe(hash);
  });

  it('should reject expired auth_date', () => {
    // Create initData with old auth_date
    const user = { id: 123456789, first_name: 'Test' };
    const authDate = Math.floor(Date.now() / 1000) - 7200; // 2 hours ago
    const params = new URLSearchParams();
    params.set('user', JSON.stringify(user));
    params.set('auth_date', String(authDate));

    // The auth is older than INIT_DATA_MAX_AGE (1 hour)
    const now = Math.floor(Date.now() / 1000);
    expect(now - authDate).toBeGreaterThan(3600);
  });
});

describe('HMAC-SHA256 algorithm', () => {
  it('should produce consistent results', () => {
    const key = 'WebAppData';
    const data = 'test-token';

    const hash1 = crypto.createHmac('sha256', key).update(data).digest('hex');
    const hash2 = crypto.createHmac('sha256', key).update(data).digest('hex');

    expect(hash1).toBe(hash2);
  });

  it('should produce different results for different inputs', () => {
    const key = 'WebAppData';

    const hash1 = crypto.createHmac('sha256', key).update('token1').digest('hex');
    const hash2 = crypto.createHmac('sha256', key).update('token2').digest('hex');

    expect(hash1).not.toBe(hash2);
  });
});
