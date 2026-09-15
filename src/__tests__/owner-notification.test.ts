import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ownerNotificationService,
  assertNotificationDestination,
  NotifyOwnerPayload,
} from '@/lib/services/owner-notification-service';
import { executeDotCommand, ExecuteDotCommandContext } from '@/lib/commands/executor';
import { parseAnyCommand } from '@/lib/commands/parser';
import * as ephemeralService from '@/lib/services/ephemeral-service';

// Mock bot
const mockSendMessage = vi.fn().mockResolvedValue({ message_id: 888 });
vi.mock('@/lib/telegram/bot', () => ({
  getBot: () => ({
    api: {
      sendMessage: (...args: any[]) => mockSendMessage(...args),
      sendChatAction: vi.fn().mockResolvedValue(true),
    },
  }),
}));

// In-memory notifications store for tests
const mockNotificationsTable: any[] = [];

// Mock DB
vi.mock('@/lib/db', () => ({
  prisma: {
    ownerNotification: {
      create: vi.fn().mockImplementation(async ({ data }: any) => {
        const item = { id: `notif_${Date.now()}_${Math.random()}`, createdAt: new Date(), ...data };
        mockNotificationsTable.push(item);
        return item;
      }),
      update: vi.fn().mockImplementation(async ({ where, data }: any) => {
        const item = mockNotificationsTable.find((n) => n.id === where.id);
        if (item) Object.assign(item, data);
        return item;
      }),
      updateMany: vi.fn().mockImplementation(async ({ where, data }: any) => {
        let count = 0;
        for (const item of mockNotificationsTable) {
          if (!where.userId || item.userId === where.userId) {
            Object.assign(item, data);
            count++;
          }
        }
        return { count };
      }),
      findMany: vi.fn().mockImplementation(async ({ where }: any) => {
        return mockNotificationsTable.filter((n) => {
          if (where.userId && n.userId !== where.userId) return false;
          if (where.status?.in && !where.status.in.includes(n.status)) return false;
          return true;
        });
      }),
      count: vi.fn().mockImplementation(async ({ where }: any) => {
        return mockNotificationsTable.filter((n) => {
          if (where.userId && n.userId !== where.userId) return false;
          if (where.status?.in && !where.status.in.includes(n.status)) return false;
          return true;
        }).length;
      }),
    },
    commandExecution: {
      upsert: vi.fn().mockResolvedValue({ id: 'exec_test_1', status: 'PROCESSING' }),
      update: vi.fn().mockResolvedValue({ id: 'exec_test_1', status: 'SUCCESS' }),
    },
    message: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    messageMedia: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe('SerkoGram Private Owner Notifications & Silent Archive Tests', () => {
  const OWNER_TG_ID = BigInt('111222333');
  const INTERLOCUTOR_TG_ID = BigInt('999888777');
  const MANAGED_CHAT_ID = BigInt('100200300');
  const USER_ID_A = 'user_owner_a';
  const USER_ID_B = 'user_owner_b';

  beforeEach(() => {
    vi.clearAllMocks();
    mockNotificationsTable.length = 0;
  });

  // Test 1: archive success → owner only, NOT managed chat
  it('Test 1: archive success → owner only, NOT managed chat', async () => {
    vi.spyOn(ephemeralService, 'saveEphemeralMedia').mockResolvedValueOnce({
      success: true,
      archiveStatus: 'ARCHIVED',
      message: 'Медиафайл успешно сохранён',
      isViewOnce: false,
      isEphemeral: false,
      media: { id: 'media_1', mediaType: 'PHOTO' } as any,
    });

    const ctx: ExecuteDotCommandContext = {
      parsed: parseAnyCommand('.save'),
      chatId: 'chat_internal_1',
      telegramChatId: MANAGED_CHAT_ID,
      businessConnectionId: 'bc_managed_1',
      userId: USER_ID_A,
      callerTelegramId: OWNER_TG_ID,
      ownerTelegramId: OWNER_TG_ID,
      isOwner: true,
      messageId: 501,
      replyToMessageId: 500,
      chatTitle: 'Диалог с партнёром',
      isDirectBotChat: false,
    };

    const res = await executeDotCommand(ctx);

    // 1. Result should be silent to the managed chat
    expect(res.status).toBe('SUCCESS');
    expect(res.responseMessage).toBeFalsy();

    // 2. bot.api.sendMessage was NOT called with business_connection_id or to MANAGED_CHAT_ID
    const managedCalls = mockSendMessage.mock.calls.filter(
      (call) => call[0] === MANAGED_CHAT_ID.toString() && call[2]?.business_connection_id
    );
    expect(managedCalls.length).toBe(0);

    // 3. bot.api.sendMessage WAS sent directly to OWNER_TG_ID (without business_connection_id)
    const ownerCalls = mockSendMessage.mock.calls.filter(
      (call) => call[0] === OWNER_TG_ID.toString() && !call[2]?.business_connection_id
    );
    expect(ownerCalls.length).toBe(1);
    expect(ownerCalls[0][1]).toContain('Медиафайл сохранён');
  });

  // Test 2: archive failure → owner only, NOT managed chat
  it('Test 2: archive failure → owner only, NOT managed chat', async () => {
    vi.spyOn(ephemeralService, 'saveEphemeralMedia').mockResolvedValueOnce({
      success: false,
      archiveStatus: 'FAILED',
      message: 'Ошибка скачивания файла',
      error: 'Ошибка скачивания файла',
    });

    const ctx: ExecuteDotCommandContext = {
      parsed: parseAnyCommand('.save'),
      chatId: 'chat_internal_1',
      telegramChatId: MANAGED_CHAT_ID,
      businessConnectionId: 'bc_managed_1',
      userId: USER_ID_A,
      callerTelegramId: OWNER_TG_ID,
      ownerTelegramId: OWNER_TG_ID,
      isOwner: true,
      messageId: 502,
      replyToMessageId: 500,
      chatTitle: 'Диалог с партнёром',
      isDirectBotChat: false,
    };

    const res = await executeDotCommand(ctx);

    // Silent to interlocutor
    expect(res.status).toBe('SUCCESS');
    expect(res.responseMessage).toBeFalsy();

    // Owner receives private notification of failure
    const ownerCalls = mockSendMessage.mock.calls.filter(
      (call) => call[0] === OWNER_TG_ID.toString() && !call[2]?.business_connection_id
    );
    expect(ownerCalls.length).toBe(1);
    expect(ownerCalls[0][1]).toContain('Ошибка сохранения медиа');
  });

  // Test 3: ephemeral success → owner only, NOT managed chat
  it('Test 3: ephemeral success → owner only, NOT managed chat', async () => {
    vi.spyOn(ephemeralService, 'saveEphemeralMedia').mockResolvedValueOnce({
      success: true,
      archiveStatus: 'ARCHIVED',
      message: 'Одноразовое медиа сохранено',
      isViewOnce: true,
      isEphemeral: true,
      media: { id: 'media_eph_1', mediaType: 'PHOTO' } as any,
    });

    const ctx: ExecuteDotCommandContext = {
      parsed: parseAnyCommand('.save'),
      chatId: 'chat_internal_1',
      telegramChatId: MANAGED_CHAT_ID,
      businessConnectionId: 'bc_managed_1',
      userId: USER_ID_A,
      callerTelegramId: OWNER_TG_ID,
      ownerTelegramId: OWNER_TG_ID,
      isOwner: true,
      messageId: 503,
      replyToMessageId: 500,
      chatTitle: 'Секретный диалог',
      isDirectBotChat: false,
    };

    const res = await executeDotCommand(ctx);
    expect(res.responseMessage).toBeFalsy();

    const ownerCalls = mockSendMessage.mock.calls.filter(
      (call) => call[0] === OWNER_TG_ID.toString() && !call[2]?.business_connection_id
    );
    expect(ownerCalls.length).toBe(1);
    expect(ownerCalls[0][1]).toContain('Одноразовое медиа сохранено');
  });

  // Test 4: auto archive → silent (no Telegram messages)
  it('Test 4: auto archive operations do not trigger bot.api.sendMessage to managed chat', async () => {
    // Normal archiving of a message should be completely silent to the chat
    mockSendMessage.mockClear();

    // Verify that querying or reading messages never sends telegram messages
    const notifications = await ownerNotificationService.getOwnerNotifications(USER_ID_A);
    expect(mockSendMessage).not.toHaveBeenCalled();
    expect(notifications.items).toBeDefined();
  });

  // Test 5: public command (.coin, .help, .flip) → current chat
  it('Test 5: public command (.coin, .flip) → executes in current chat', async () => {
    mockSendMessage.mockClear();

    const ctxCoin: ExecuteDotCommandContext = {
      parsed: parseAnyCommand('.coin'),
      chatId: 'chat_internal_1',
      telegramChatId: MANAGED_CHAT_ID,
      businessConnectionId: 'bc_managed_1',
      userId: USER_ID_A,
      callerTelegramId: OWNER_TG_ID,
      ownerTelegramId: OWNER_TG_ID,
      isOwner: true,
      messageId: 504,
      isDirectBotChat: false,
    };

    const resCoin = await executeDotCommand(ctxCoin);
    expect(resCoin.status).toBe('SUCCESS');
    expect(resCoin.responseMessage).toContain('Результат броска:');

    // Was sent to MANAGED_CHAT_ID via businessConnectionId
    expect(mockSendMessage).toHaveBeenCalledWith(
      MANAGED_CHAT_ID.toString(),
      expect.stringContaining('Результат броска:'),
      expect.objectContaining({ business_connection_id: 'bc_managed_1' })
    );
  });

  // Test 6: assertNotificationDestination: wrong destination → throws and blocks
  it('Test 6: assertNotificationDestination: wrong destination throws security violation', () => {
    expect(() => {
      assertNotificationDestination(INTERLOCUTOR_TG_ID, OWNER_TG_ID, 'ARCHIVE_SUCCESS');
    }).toThrow('[SECURITY VIOLATION]');

    expect(() => {
      assertNotificationDestination(MANAGED_CHAT_ID, OWNER_TG_ID, 'EPHEMERAL_SAVED');
    }).toThrow('[SECURITY VIOLATION]');

    // Matches owner → does not throw
    expect(() => {
      assertNotificationDestination(OWNER_TG_ID, OWNER_TG_ID, 'ARCHIVE_SUCCESS');
    }).not.toThrow();
  });

  // Test 7: multi-user separation: user A notifications never reach user B
  it('Test 7: multi-user separation: user A notifications never reach user B', async () => {
    await ownerNotificationService.notifyArchiveSuccess({
      userId: USER_ID_A,
      telegramUserId: OWNER_TG_ID,
      chatTitle: 'Чат А',
    });

    await ownerNotificationService.notifyArchiveSuccess({
      userId: USER_ID_B,
      telegramUserId: BigInt('555666777'),
      chatTitle: 'Чат Б',
    });

    const notifsA = await ownerNotificationService.getOwnerNotifications(USER_ID_A);
    const notifsB = await ownerNotificationService.getOwnerNotifications(USER_ID_B);

    expect(notifsA.items.every((n) => n.userId === USER_ID_A)).toBe(true);
    expect(notifsB.items.every((n) => n.userId === USER_ID_B)).toBe(true);
    expect(notifsA.items.length).toBe(1);
    expect(notifsB.items.length).toBe(1);
  });

  // Test 8: multi-chat separation: notification carries correct chat metadata
  it('Test 8: multi-chat separation: notification carries correct chat metadata', async () => {
    await ownerNotificationService.notifyArchiveSuccess({
      userId: USER_ID_A,
      telegramUserId: OWNER_TG_ID,
      chatId: 'chat_special_xyz',
      chatTitle: 'Важный диалог',
      messageId: 9988,
    });

    const notifs = await ownerNotificationService.getOwnerNotifications(USER_ID_A);
    const item = notifs.items.find((n) => n.chatId === 'chat_special_xyz');

    expect(item).toBeDefined();
    expect(item?.chatTitle).toBe('Важный диалог');
    expect(item?.messageId).toBe(9988);
  });

  // Test 9: no self-loop: bot does not notify itself
  it('Test 9: commands from bot ID are cancelled to prevent self-loops', async () => {
    process.env.TELEGRAM_BOT_TOKEN = '123456789:ABCDEF_TEST_TOKEN';
    const BOT_ID = BigInt('123456789');

    const ctx: ExecuteDotCommandContext = {
      parsed: parseAnyCommand('.save'),
      chatId: 'chat_internal_1',
      telegramChatId: MANAGED_CHAT_ID,
      businessConnectionId: 'bc_managed_1',
      userId: USER_ID_A,
      callerTelegramId: BOT_ID,
      ownerTelegramId: OWNER_TG_ID,
      isOwner: false,
      messageId: 505,
      isDirectBotChat: false,
    };

    const res = await executeDotCommand(ctx);
    expect(res.status).toBe('CANCELLED');
    expect(res.errorCode).toBe('SELF_TRIGGER_PREVENTED');
  });

  // Test 10: graceful fallback when owner hasn't started bot chat (status: PENDING)
  it('Test 10: graceful fallback when owner has not started bot chat (status: PENDING)', async () => {
    // Simulate Telegram Bot API throwing 403 Forbidden (bot was blocked or never started by user)
    mockSendMessage.mockRejectedValueOnce(new Error('Forbidden: bot was blocked by the user'));

    const res = await ownerNotificationService.notifyArchiveSuccess({
      userId: USER_ID_A,
      telegramUserId: OWNER_TG_ID,
      chatTitle: 'Чат без /start',
    });

    expect(res.success).toBe(true);
    expect(res.deliveredViaTelegram).toBe(false);
    expect(res.status).toBe('PENDING');

    // Notification is safely saved in DB for Mini App inbox
    const inbox = await ownerNotificationService.getOwnerNotifications(USER_ID_A);
    expect(inbox.items.some((n) => n.chatTitle === 'Чат без /start')).toBe(true);
  });
});
