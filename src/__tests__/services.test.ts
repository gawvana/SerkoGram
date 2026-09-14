// ============================================================
// SerkoGram — Services & Adapter Unit Tests
// ============================================================

import { describe, it, expect } from 'vitest';
import { BusinessAdapter, ChatAutomationAdapter, getAdapter } from '@/lib/services/connection-service';

describe('Connection Adapter Pattern', () => {
  it('should instantiate BusinessAdapter correctly', () => {
    const adapter = getAdapter('BUSINESS');
    expect(adapter).toBeInstanceOf(BusinessAdapter);
  });

  it('should instantiate ChatAutomationAdapter correctly', () => {
    const adapter = getAdapter('CHAT_AUTOMATION');
    expect(adapter).toBeInstanceOf(ChatAutomationAdapter);
  });

  it('ChatAutomationAdapter permissions should reflect official state (not granted)', async () => {
    const adapter = new ChatAutomationAdapter();
    const permissions = await adapter.getPermissions('test_conn_id');
    expect(permissions.length).toBeGreaterThan(0);
    permissions.forEach((perm) => {
      expect(perm.granted).toBe(false);
    });
  });
});

describe('Constants & Types mapping', () => {
  it('should have Russian labels for all key entities', async () => {
    const { MESSAGE_TYPE_LABELS, TICKET_STATUS_LABELS, RETENTION_LABELS } = await import('@/lib/constants');

    expect(MESSAGE_TYPE_LABELS.TEXT).toBe('Текст');
    expect(MESSAGE_TYPE_LABELS.PHOTO).toBe('Фото');
    expect(MESSAGE_TYPE_LABELS.VOICE).toBe('Голосовое');

    expect(TICKET_STATUS_LABELS.OPEN).toBe('Открыт');
    expect(TICKET_STATUS_LABELS.RESOLVED).toBe('Решён');

    expect(RETENTION_LABELS.FOREVER).toBe('Навсегда');
    expect(RETENTION_LABELS.DAYS_30).toBe('30 дней');
  });
});
