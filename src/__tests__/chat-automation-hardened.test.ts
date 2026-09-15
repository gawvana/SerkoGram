import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeDotCommand, ExecuteDotCommandContext } from '@/lib/commands/executor';
import { parseAnyCommand } from '@/lib/commands/parser';
import { chatAutomation, getBusinessRights } from '@/lib/services/connection-service';

// Mock DB
vi.mock('@/lib/db', () => ({
  prisma: {
    commandExecution: {
      upsert: vi.fn().mockResolvedValue({ id: 'exec_test_1', status: 'PROCESSING' }),
      update: vi.fn().mockResolvedValue({ id: 'exec_test_1', status: 'SUCCESS' }),
    },
    message: {
      findUnique: vi.fn(),
    },
    chat: {
      findUnique: vi.fn().mockResolvedValue({ id: 'chat_test', telegramChatId: BigInt('100200300') }),
    },
    chatAutomationSettings: {
      findUnique: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockImplementation(({ update, create }) => Promise.resolve({ id: 'cas_1', ...create, ...update })),
    },
    chatWarning: {
      findUnique: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue({ id: 'cw_1', count: 1 }),
      delete: vi.fn().mockResolvedValue({ id: 'cw_1' }),
    },
    ownerNotification: {
      create: vi.fn().mockResolvedValue({ id: 'notif_1' }),
      update: vi.fn().mockResolvedValue({ id: 'notif_1' }),
      findMany: vi.fn().mockResolvedValue([]),
    },
    businessConnection: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'bc_db_1',
        canReply: true,
        isEnabled: true,
      }),
    },
  },
}));

// Mock Bot
const mockSendMessage = vi.fn().mockResolvedValue({ message_id: 1001 });
const mockDeleteMessage = vi.fn().mockResolvedValue(true);
const mockSendDice = vi.fn().mockResolvedValue({ message_id: 1002 });

vi.mock('@/lib/telegram/bot', () => ({
  getBot: () => ({
    api: {
      sendMessage: mockSendMessage,
      deleteMessage: mockDeleteMessage,
      sendDice: mockSendDice,
    },
  }),
}));

describe('Hardened Chat Automation & Real Dot Commands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should activate .mute with duration and persist in DB', async () => {
    const ctx: ExecuteDotCommandContext = {
      parsed: parseAnyCommand('.mute 30'),
      chatId: 'chat_test_mute',
      telegramChatId: BigInt('100200300'),
      businessConnectionId: 'bc_test_1',
      userId: 'user_1',
      callerTelegramId: BigInt('111222333'),
      isOwner: true,
      messageId: 201,
    };

    const res = await executeDotCommand(ctx);
    expect(res.status).toBe('SUCCESS');
    expect(res.responseMessage).toContain('Ограничение диалога активировано');
    expect(res.responseMessage).toContain('30 мин.');

    const settings = await chatAutomation.getChatSettings('chat_test_mute');
    expect(settings.muteEnabled).toBe(true);
    expect(settings.muteUntil).toBeDefined();
  });

  it('should disable .mute with .mute off or .unmute', async () => {
    const ctxOff: ExecuteDotCommandContext = {
      parsed: parseAnyCommand('.mute off'),
      chatId: 'chat_test_mute',
      telegramChatId: BigInt('100200300'),
      businessConnectionId: 'bc_test_1',
      userId: 'user_1',
      callerTelegramId: BigInt('111222333'),
      isOwner: true,
      messageId: 202,
    };

    const resOff = await executeDotCommand(ctxOff);
    expect(resOff.status).toBe('SUCCESS');
    expect(resOff.responseMessage).toContain('Ограничение снято');

    const settingsOff = await chatAutomation.getChatSettings('chat_test_mute');
    expect(settingsOff.muteEnabled).toBe(false);

    // Also test .unmute
    const ctxUnmute: ExecuteDotCommandContext = {
      parsed: parseAnyCommand('.unmute'),
      chatId: 'chat_test_mute',
      telegramChatId: BigInt('100200300'),
      businessConnectionId: 'bc_test_1',
      userId: 'user_1',
      callerTelegramId: BigInt('111222333'),
      isOwner: true,
      messageId: 203,
    };

    const resUnmute = await executeDotCommand(ctxUnmute);
    expect(resUnmute.status).toBe('SUCCESS');
    expect(resUnmute.responseMessage).toContain('Ограничение снято');
  });

  it('should activate .panic emergency mode and disable with .panic off or .unpanic', async () => {
    const ctxPanic: ExecuteDotCommandContext = {
      parsed: parseAnyCommand('.panic'),
      chatId: 'chat_test_panic',
      telegramChatId: BigInt('100200300'),
      businessConnectionId: 'bc_test_1',
      userId: 'user_1',
      callerTelegramId: BigInt('111222333'),
      isOwner: true,
      messageId: 204,
    };

    const resPanic = await executeDotCommand(ctxPanic);
    expect(resPanic.status).toBe('SUCCESS');
    expect(resPanic.responseMessage).toContain('PANIC MODE активирован');

    const settingsPanic = await chatAutomation.getChatSettings('chat_test_panic');
    expect(settingsPanic.panicEnabled).toBe(true);

    // Disable via .panic off
    const ctxPanicOff: ExecuteDotCommandContext = {
      parsed: parseAnyCommand('.panic off'),
      chatId: 'chat_test_panic',
      telegramChatId: BigInt('100200300'),
      businessConnectionId: 'bc_test_1',
      userId: 'user_1',
      callerTelegramId: BigInt('111222333'),
      isOwner: true,
      messageId: 205,
    };

    const resPanicOff = await executeDotCommand(ctxPanicOff);
    expect(resPanicOff.status).toBe('SUCCESS');
    expect(resPanicOff.responseMessage).toContain('Режим PANIC отключён');

    const settingsPanicOff = await chatAutomation.getChatSettings('chat_test_panic');
    expect(settingsPanicOff.panicEnabled).toBe(false);
  });

  it('should return honest unavailable message for STT (.stt)', async () => {
    const ctx: ExecuteDotCommandContext = {
      parsed: parseAnyCommand('.stt'),
      chatId: 'chat_test',
      telegramChatId: BigInt('100200300'),
      businessConnectionId: 'bc_test_1',
      userId: 'user_1',
      callerTelegramId: BigInt('111222333'),
      isOwner: true,
      messageId: 206,
    };

    const res = await executeDotCommand(ctx);
    expect(res.status).toBe('CANCELLED');
    expect(res.errorCode).toBe('COMMAND_DISABLED');
    expect(res.responseMessage).toContain('Команда недоступна');
    expect(res.responseMessage).toContain('Whisper / Google STT');
  });

  it('should return honest unavailable message for video processing (.vnote, .vreverse)', async () => {
    const ctxVnote: ExecuteDotCommandContext = {
      parsed: parseAnyCommand('.vnote'),
      chatId: 'chat_test',
      telegramChatId: BigInt('100200300'),
      businessConnectionId: 'bc_test_1',
      userId: 'user_1',
      callerTelegramId: BigInt('111222333'),
      isOwner: true,
      messageId: 207,
    };

    const resVnote = await executeDotCommand(ctxVnote);
    expect(resVnote.status).toBe('CANCELLED');
    expect(resVnote.errorCode).toBe('COMMAND_DISABLED');
    expect(resVnote.responseMessage).toContain('FFmpeg');

    const ctxVrev: ExecuteDotCommandContext = {
      parsed: parseAnyCommand('.vreverse'),
      chatId: 'chat_test',
      telegramChatId: BigInt('100200300'),
      businessConnectionId: 'bc_test_1',
      userId: 'user_1',
      callerTelegramId: BigInt('111222333'),
      isOwner: true,
      messageId: 208,
    };

    const resVrev = await executeDotCommand(ctxVrev);
    expect(resVrev.status).toBe('CANCELLED');
    expect(resVrev.errorCode).toBe('COMMAND_DISABLED');
    expect(resVrev.responseMessage).toContain('FFmpeg');
  });

  it('should return honest unavailable message for MTProto features (.online, .autotyping, .autovoice)', async () => {
    const ctxOnline: ExecuteDotCommandContext = {
      parsed: parseAnyCommand('.online'),
      chatId: 'chat_test',
      telegramChatId: BigInt('100200300'),
      businessConnectionId: 'bc_test_1',
      userId: 'user_1',
      callerTelegramId: BigInt('111222333'),
      isOwner: true,
      messageId: 209,
    };

    const resOnline = await executeDotCommand(ctxOnline);
    expect(resOnline.status).toBe('CANCELLED');
    expect(resOnline.errorCode).toBe('COMMAND_DISABLED');
    expect(resOnline.responseMessage).toContain('MTProto');

    const ctxAutoType: ExecuteDotCommandContext = {
      parsed: parseAnyCommand('.autotyping'),
      chatId: 'chat_test',
      telegramChatId: BigInt('100200300'),
      businessConnectionId: 'bc_test_1',
      userId: 'user_1',
      callerTelegramId: BigInt('111222333'),
      isOwner: true,
      messageId: 210,
    };

    const resAutoType = await executeDotCommand(ctxAutoType);
    expect(resAutoType.status).toBe('CANCELLED');
    expect(resAutoType.errorCode).toBe('COMMAND_DISABLED');
    expect(resAutoType.responseMessage).toContain('MTProto');
  });

  it('should correctly enforce serverless limit on .timer', async () => {
    const ctxLong: ExecuteDotCommandContext = {
      parsed: parseAnyCommand('.timer 120'),
      chatId: 'chat_test',
      telegramChatId: BigInt('100200300'),
      businessConnectionId: 'bc_test_1',
      userId: 'user_1',
      callerTelegramId: BigInt('111222333'),
      isOwner: true,
      messageId: 211,
    };

    const resLong = await executeDotCommand(ctxLong);
    expect(resLong.status).toBe('SUCCESS');
    expect(resLong.responseMessage).toContain('55 секунд');

    const ctxShort: ExecuteDotCommandContext = {
      parsed: parseAnyCommand('.timer 10'),
      chatId: 'chat_test',
      telegramChatId: BigInt('100200300'),
      businessConnectionId: 'bc_test_1',
      userId: 'user_1',
      callerTelegramId: BigInt('111222333'),
      isOwner: true,
      messageId: 212,
    };

    const resShort = await executeDotCommand(ctxShort);
    expect(resShort.status).toBe('SUCCESS');
    expect(resShort.responseMessage).toContain('Таймер запущен на 10 сек');
  });

  it('should send native Telegram dice for .dice / .дайс', async () => {
    const ctxDice: ExecuteDotCommandContext = {
      parsed: parseAnyCommand('.dice'),
      chatId: 'chat_test',
      telegramChatId: BigInt('100200300'),
      businessConnectionId: 'bc_test_1',
      userId: 'user_1',
      callerTelegramId: BigInt('111222333'),
      isOwner: true,
      messageId: 213,
    };

    const resDice = await executeDotCommand(ctxDice);
    expect(resDice.status).toBe('SUCCESS');
    expect(mockSendDice).toHaveBeenCalledWith('100200300', '🎲', {
      business_connection_id: 'bc_test_1',
    });
  });

  it('should strictly distinguish canReply from delete rights in getBusinessRights', async () => {
    const rights = await getBusinessRights('bc_db_1');
    expect(rights.canReply).toBe(true);
    // Strict requirement: canReply does NOT grant deleteReceivedMessages
    expect(rights.deleteReceivedMessages).toBe(false);
    expect(rights.deleteSentMessages).toBe(false);
  });
});
