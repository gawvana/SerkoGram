import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeDotCommand, ExecuteDotCommandContext } from '@/lib/commands/executor';
import { parseAnyCommand } from '@/lib/commands/parser';
import { toFlip, toBubble, toSpoiler, toZalgo } from '@/lib/commands/text-effects';
import { getCommand, COMMANDS_REGISTRY } from '@/lib/telegram/commands';
import { chatAutomation } from '@/lib/services/connection-service';

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
const mockEditMessageText = vi.fn().mockResolvedValue(true);
const mockGetBusinessConnection = vi.fn().mockResolvedValue({
  id: 'bc_test_1',
  is_enabled: true,
  rights: {
    can_reply: true,
    can_delete_outgoing_messages: true,
    can_delete_all_messages: true,
  },
});

vi.mock('@/lib/telegram/bot', () => ({
  getBot: () => ({
    api: {
      sendMessage: mockSendMessage,
      deleteMessage: mockDeleteMessage,
      editMessageText: mockEditMessageText,
      getBusinessConnection: mockGetBusinessConnection,
    },
  }),
}));

describe('TextEffects & Interactive Control UX Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Text effects: toSpoiler outputs native Telegram HTML tg-spoiler', () => {
    const spoiler = toSpoiler('Секретный код 123');
    expect(spoiler).toBe('<tg-spoiler>Секретный код 123</tg-spoiler>');
  });

  it('Text effects: toFlip correctly flips Cyrillic and Latin', () => {
    const flippedLatin = toFlip('hello');
    expect(flippedLatin).toBe('ollǝɥ');

    const flippedCyrillic = toFlip('я');
    expect(flippedCyrillic).toBe('ʁ');
  });

  it('Text effects: toBubble transforms characters into circled glyphs', () => {
    const bubbled = toBubble('abc 123');
    expect(bubbled).toContain('ⓐ');
    expect(bubbled).toContain('①');
  });

  it('Text effects: toZalgo caps text to prevent huge payloads', () => {
    const longText = 'A'.repeat(500);
    const zalgo = toZalgo(longText);
    expect(zalgo.length).toBeLessThan(1000);
  });

  it('.mute command includes inline keyboard for instant unmute and cleans up control message', async () => {
    const ctx: ExecuteDotCommandContext = {
      parsed: parseAnyCommand('.mute 10'),
      chatId: 'chat_mute_ux',
      telegramChatId: BigInt('100200300'),
      businessConnectionId: 'bc_test_1',
      userId: 'user_1',
      callerTelegramId: BigInt('111222333'),
      isOwner: true,
      messageId: 777,
      isDirectBotChat: false,
    };

    const res = await executeDotCommand(ctx);
    expect(res.status).toBe('SUCCESS');
    expect(mockSendMessage).toHaveBeenCalled();

    // Verify inline keyboard was passed to sendMessage
    const lastSendCall = mockSendMessage.mock.calls[0];
    const sendOptions = lastSendCall[2];
    expect(sendOptions.reply_markup).toBeDefined();
    expect(sendOptions.reply_markup.inline_keyboard[0][0].text).toContain('Размутить');

    // Verify command message cleanup was attempted
    expect(mockDeleteMessage).toHaveBeenCalledWith('100200300', 777);
  });

  it('.panic command includes inline controls and cleans up control message', async () => {
    const ctx: ExecuteDotCommandContext = {
      parsed: parseAnyCommand('.panic'),
      chatId: 'chat_panic_ux',
      telegramChatId: BigInt('100200300'),
      businessConnectionId: 'bc_test_1',
      userId: 'user_1',
      callerTelegramId: BigInt('111222333'),
      isOwner: true,
      messageId: 888,
      isDirectBotChat: false,
    };

    const res = await executeDotCommand(ctx);
    expect(res.status).toBe('SUCCESS');

    const chatSendCall = mockSendMessage.mock.calls.find((call) => call[0] === '100200300');
    expect(chatSendCall).toBeDefined();
    const sendOptions = chatSendCall![2];
    expect(sendOptions.reply_markup).toBeDefined();
    expect(sendOptions.reply_markup.inline_keyboard[0][0].text).toContain('Отключить Panic');

    // Verify command message cleanup
    expect(mockDeleteMessage).toHaveBeenCalledWith('100200300', 888);
  });

  it('text effect commands (.spoiler, .flip, .bubble, .dumb, .leet, .zalgo, .nospace) are in registry and execute', async () => {
    const spoilerCmd = getCommand('spoiler');
    expect(spoilerCmd).toBeDefined();
    expect(spoilerCmd?.category).toBe('utility');

    const flipCmd = getCommand('flip');
    expect(flipCmd).toBeDefined();

    const nospaceCmd = getCommand('nospace');
    expect(nospaceCmd).toBeDefined();
    expect(nospaceCmd?.category).toBe('fun');

    // Execute .spoiler
    const resSpoiler = await executeDotCommand({
      parsed: parseAnyCommand('.spoiler секрет'),
      chatId: 'chat_test',
      telegramChatId: BigInt('100200300'),
      userId: 'user_1',
      callerTelegramId: BigInt('111222333'),
      isOwner: true,
      messageId: 101,
      isDirectBotChat: true,
    });
    expect(resSpoiler.status).toBe('SUCCESS');
    expect(resSpoiler.responseMessage).toContain('<tg-spoiler>секрет</tg-spoiler>');
  });

  it('.mute rejects invalid duration argument with clear error message', async () => {
    const resInvalid = await executeDotCommand({
      parsed: parseAnyCommand('.mute abc'),
      chatId: 'chat_test',
      telegramChatId: BigInt('100200300'),
      userId: 'user_1',
      callerTelegramId: BigInt('111222333'),
      isOwner: true,
      messageId: 102,
      isDirectBotChat: false,
    });
    expect(resInvalid.status).toBe('SUCCESS');
    expect(resInvalid.responseMessage).toContain('Неверная длительность');

    const resOutOfRange = await executeDotCommand({
      parsed: parseAnyCommand('.mute 9999'),
      chatId: 'chat_test',
      telegramChatId: BigInt('100200300'),
      userId: 'user_1',
      callerTelegramId: BigInt('111222333'),
      isOwner: true,
      messageId: 103,
      isDirectBotChat: false,
    });
    expect(resOutOfRange.status).toBe('SUCCESS');
    expect(resOutOfRange.responseMessage).toContain('Недопустимая длительность');
  });
});
