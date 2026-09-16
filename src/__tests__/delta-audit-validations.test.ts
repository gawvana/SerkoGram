import { describe, it, expect, vi, beforeEach } from 'vitest';
import { safeEvaluateArithmetic } from '@/lib/utils/math-eval';
import { t, resolveLanguage } from '@/lib/i18n';
import {
  ownerNotificationService,
  assertNotificationDestination,
} from '@/lib/services/owner-notification-service';
import { prisma } from '@/lib/db';

vi.mock('@/lib/db', () => {
  const store = new Map<string, any>();
  return {
    prisma: {
      ownerNotification: {
        create: vi.fn().mockImplementation(({ data }: any) => {
          if (data.dedupeKey && store.has(data.dedupeKey)) {
            const err: any = new Error('Unique constraint failed');
            err.code = 'P2002';
            throw err;
          }
          const rec = { id: 'notif_' + Math.random().toString(36).slice(2), ...data, createdAt: new Date() };
          if (data.dedupeKey) store.set(data.dedupeKey, rec);
          return Promise.resolve(rec);
        }),
        findUnique: vi.fn().mockImplementation(({ where }: any) => {
          if (where.dedupeKey && store.has(where.dedupeKey)) {
            return Promise.resolve(store.get(where.dedupeKey));
          }
          return Promise.resolve(null);
        }),
        update: vi.fn().mockImplementation(({ where, data }: any) => {
          return Promise.resolve({ id: where.id, ...data });
        }),
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
      },
    },
  };
});

vi.mock('@/lib/telegram/bot', () => ({
  getBot: vi.fn().mockReturnValue({
    api: {
      sendMessage: vi.fn().mockResolvedValue({ message_id: 1234 }),
      deleteMessage: vi.fn().mockResolvedValue(true),
      deleteBusinessMessages: vi.fn().mockResolvedValue(true),
    },
  }),
}));

describe('Delta Audit & Hardened Validations', () => {
  describe('Safe Arithmetic Evaluator (No eval / Function)', () => {
    it('evaluates basic operations correctly', () => {
      expect(safeEvaluateArithmetic('2 + 2')).toBe(4);
      expect(safeEvaluateArithmetic('10 - 3 * 2')).toBe(4);
      expect(safeEvaluateArithmetic('(10 - 3) * 2')).toBe(14);
      expect(safeEvaluateArithmetic('20 / 4')).toBe(5);
      expect(safeEvaluateArithmetic('2^4')).toBe(16);
      expect(safeEvaluateArithmetic('10 % 3')).toBe(1);
    });

    it('handles floating point numbers and comma substitution', () => {
      expect(safeEvaluateArithmetic('3.5 * 2')).toBe(7);
      expect(safeEvaluateArithmetic('2,5 + 2,5')).toBe(5);
    });

    it('handles unary plus and minus', () => {
      expect(safeEvaluateArithmetic('-5 + 10')).toBe(5);
      expect(safeEvaluateArithmetic('-(2 + 3)')).toBe(-5);
      expect(safeEvaluateArithmetic('+5')).toBe(5);
    });

    it('rejects division and modulo by zero', () => {
      expect(() => safeEvaluateArithmetic('10 / 0')).toThrow('Division by zero');
      expect(() => safeEvaluateArithmetic('10 % 0')).toThrow('Modulo by zero');
    });

    it('strictly rejects malicious payloads and invalid characters', () => {
      expect(() => safeEvaluateArithmetic('alert(1)')).toThrow('Invalid character');
      expect(() => safeEvaluateArithmetic('console.log(process)')).toThrow('Invalid character');
      expect(() => safeEvaluateArithmetic('__proto__')).toThrow('Invalid character');
      expect(() => safeEvaluateArithmetic('1 + (2 * 3')).toThrow('Missing closing parenthesis');
    });
  });

  describe('Multi-language i18n Engine', () => {
    it('resolves languages correctly', () => {
      expect(resolveLanguage('ru')).toBe('ru');
      expect(resolveLanguage('uz')).toBe('uz');
      expect(resolveLanguage('en')).toBe('en');
      expect(resolveLanguage('EN-US')).toBe('en');
      expect(resolveLanguage(null)).toBe('ru');
      expect(resolveLanguage('fr')).toBe('ru'); // fallback
    });

    it('translates keys with interpolation for all languages', () => {
      // Russian
      expect(t('notify.accountConnected.title', 'ru')).toContain('Аккаунт подключён');
      expect(t('notify.messagesDeleted.text', 'ru', { count: 5 })).toContain('5 сообщений');

      // Uzbek
      expect(t('notify.accountConnected.title', 'uz')).toContain('Hisob ulandi');
      expect(t('notify.messagesDeleted.text', 'uz', { count: 3 })).toContain('3 ta xabar');

      // English
      expect(t('notify.accountConnected.title', 'en')).toContain('Account Connected');
      expect(t('notify.messagesDeleted.text', 'en', { count: 8 })).toContain('8 messages');
    });
  });

  describe('Owner Notification Idempotency & Types', () => {
    it('creates ACCOUNT_CONNECTED notification and deduplicates on identical key', async () => {
      const payload = {
        userId: 'usr_test_1',
        telegramUserId: '987654321',
        connectionId: 'conn_test_1',
        dedupeKey: 'conn_event_1001',
      };

      const res1 = await ownerNotificationService.notifyAccountConnected(payload);
      expect(res1.success).toBe(true);

      // Second call with same dedupeKey must return deduplicated result without throwing
      const res2 = await ownerNotificationService.notifyAccountConnected(payload);
      expect(res2.success).toBe(true);
    });

    it('creates aggregated MESSAGE_DELETED notification for multiple messages', async () => {
      const res = await ownerNotificationService.notifyMessageDeleted({
        userId: 'usr_test_1',
        telegramUserId: '987654321',
        chatId: 'chat_test_1',
        messageIds: [101, 102, 103, 104],
        dedupeKey: 'del_101_102_103_104',
      });
      expect(res.success).toBe(true);
    });

    it('assertNotificationDestination blocks non-owner destinations for new notification types', () => {
      expect(() => {
        assertNotificationDestination('111222333', '999888777', 'MESSAGE_EDITED');
      }).toThrow('[SECURITY VIOLATION]');

      expect(() => {
        assertNotificationDestination('111222333', '999888777', 'ACCOUNT_CONNECTED');
      }).toThrow('[SECURITY VIOLATION]');

      expect(() => {
        assertNotificationDestination('111222333', '999888777', 'PERMISSION_CHANGED');
      }).toThrow('[SECURITY VIOLATION]');
    });
  });
});
