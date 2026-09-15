import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseAnyCommand } from '@/lib/commands/parser';
import { executeDotCommand, ExecuteDotCommandContext } from '@/lib/commands/executor';

// Mock Prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    commandExecution: {
      upsert: vi.fn().mockResolvedValue({ id: 'exec_1', status: 'PROCESSING' }),
      update: vi.fn().mockResolvedValue({ id: 'exec_1', status: 'SUCCESS' }),
    },
    message: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock Bot
vi.mock('@/lib/telegram/bot', () => ({
  getBot: () => ({
    api: {
      sendMessage: vi.fn().mockResolvedValue({ message_id: 999 }),
    },
  }),
}));

describe('Dot Command Parser (parseAnyCommand)', () => {
  it('should parse valid dot commands', () => {
    const res = parseAnyCommand('.help');
    expect(res.isCommand).toBe(true);
    expect(res.prefix).toBe('.');
    expect(res.command).toBe('help');
    expect(res.arguments).toEqual([]);
    expect(res.rawArguments).toBe('');
  });

  it('should parse dot command with arguments and multiple spaces', () => {
    const res = parseAnyCommand('.search   important   document  ');
    expect(res.isCommand).toBe(true);
    expect(res.command).toBe('search');
    expect(res.rawArguments).toBe('important   document');
    expect(res.arguments).toEqual(['important', 'document']);
  });

  it('should parse Russian / Unicode dot commands', () => {
    const res1 = parseAnyCommand('.перевод en');
    expect(res1.isCommand).toBe(true);
    expect(res1.command).toBe('перевод');
    expect(res1.arguments).toEqual(['en']);

    const res2 = parseAnyCommand('.гс');
    expect(res2.isCommand).toBe(true);
    expect(res2.command).toBe('гс');
  });

  it('should reject non-commands or invalid patterns', () => {
    expect(parseAnyCommand('').isCommand).toBe(false);
    expect(parseAnyCommand('...').isCommand).toBe(false);
    expect(parseAnyCommand('.').isCommand).toBe(false);
    expect(parseAnyCommand('hello .help').isCommand).toBe(false);
    expect(parseAnyCommand('some regular text').isCommand).toBe(false);
  });

  it('should respect allowedPrefixes option', () => {
    const slashOnly = parseAnyCommand('.help', { allowedPrefixes: ['/'] });
    expect(slashOnly.isCommand).toBe(false);

    const dotOnly = parseAnyCommand('/help', { allowedPrefixes: ['.'] });
    expect(dotOnly.isCommand).toBe(false);

    const dotAllowed = parseAnyCommand('.help', { allowedPrefixes: ['.'] });
    expect(dotAllowed.isCommand).toBe(true);
  });

  it('should handle bot mention target matching', () => {
    const valid = parseAnyCommand('.help@SerkoGram_bot', {
      currentBotUsername: 'SerkoGram_bot',
    });
    expect(valid.isCommand).toBe(true);
    expect(valid.command).toBe('help');

    const wrongBot = parseAnyCommand('.help@OtherBot', {
      currentBotUsername: 'SerkoGram_bot',
    });
    expect(wrongBot.isCommand).toBe(false);
  });
});

describe('Dot Command Executor (executeDotCommand)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TELEGRAM_BOT_TOKEN = '8904714820:AAEmw-TestToken';
  });

  it('should prevent bot self-triggering', async () => {
    const ctx: ExecuteDotCommandContext = {
      parsed: parseAnyCommand('.help'),
      chatId: 'chat_123',
      telegramChatId: BigInt('100200300'),
      userId: 'user_123',
      callerTelegramId: BigInt('8904714820'), // Same ID as bot token!
      isOwner: true,
      messageId: 101,
    };

    const res = await executeDotCommand(ctx);
    expect(res.status).toBe('CANCELLED');
    expect(res.errorCode).toBe('SELF_TRIGGER_PREVENTED');
  });

  it('should reject unauthorized non-owner caller', async () => {
    const ctx: ExecuteDotCommandContext = {
      parsed: parseAnyCommand('.help'),
      chatId: 'chat_123',
      telegramChatId: BigInt('100200300'),
      userId: 'user_123',
      callerTelegramId: BigInt('555666777'),
      isOwner: false, // Not owner!
      messageId: 101,
    };

    const res = await executeDotCommand(ctx);
    expect(res.status).toBe('CANCELLED');
    expect(res.errorCode).toBe('UNAUTHORIZED_CALLER');
  });

  it('should successfully execute .coin command', async () => {
    const ctx: ExecuteDotCommandContext = {
      parsed: parseAnyCommand('.coin'),
      chatId: 'chat_123',
      telegramChatId: BigInt('100200300'),
      businessConnectionId: 'bc_test_1',
      userId: 'user_123',
      callerTelegramId: BigInt('111222333'),
      isOwner: true,
      messageId: 101,
    };

    const res = await executeDotCommand(ctx);
    expect(res.status).toBe('SUCCESS');
    expect(res.responseMessage).toContain('Результат броска:');
    expect(res.resultTelegramMessageId).toBe(999);
  });

  it('should successfully execute .rps game command', async () => {
    const ctx: ExecuteDotCommandContext = {
      parsed: parseAnyCommand('.rps камень'),
      chatId: 'chat_123',
      telegramChatId: BigInt('100200300'),
      businessConnectionId: 'bc_test_1',
      userId: 'user_123',
      callerTelegramId: BigInt('111222333'),
      isOwner: true,
      messageId: 101,
    };

    const res = await executeDotCommand(ctx);
    expect(res.status).toBe('SUCCESS');
    expect(res.responseMessage).toContain('Камень, Ножницы, Бумага');
  });

  it('should successfully execute text effects (.flip, .bubble)', async () => {
    const ctxFlip: ExecuteDotCommandContext = {
      parsed: parseAnyCommand('.flip hello'),
      chatId: 'chat_123',
      telegramChatId: BigInt('100200300'),
      businessConnectionId: 'bc_test_1',
      userId: 'user_123',
      callerTelegramId: BigInt('111222333'),
      isOwner: true,
      messageId: 102,
    };

    const resFlip = await executeDotCommand(ctxFlip);
    expect(resFlip.status).toBe('SUCCESS');
    expect(resFlip.responseMessage).toBe('ollǝɥ');

    const ctxBubble: ExecuteDotCommandContext = {
      parsed: parseAnyCommand('.bubble abc'),
      chatId: 'chat_123',
      telegramChatId: BigInt('100200300'),
      businessConnectionId: 'bc_test_1',
      userId: 'user_123',
      callerTelegramId: BigInt('111222333'),
      isOwner: true,
      messageId: 103,
    };

    const resBubble = await executeDotCommand(ctxBubble);
    expect(resBubble.status).toBe('SUCCESS');
    expect(resBubble.responseMessage).toBe('ⓐⓑⓒ');
  });

  it('should format .archive link with scoped telegramChatId', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://serkogram.vercel.app';
    const ctx: ExecuteDotCommandContext = {
      parsed: parseAnyCommand('.archive'),
      chatId: 'internal_uuid_123',
      telegramChatId: BigInt('100200300'),
      businessConnectionId: 'bc_test_1',
      userId: 'user_123',
      callerTelegramId: BigInt('111222333'),
      isOwner: true,
      messageId: 104,
    };

    const res = await executeDotCommand(ctx);
    expect(res.status).toBe('SUCCESS');
    expect(res.responseMessage).toContain('https://serkogram.vercel.app/archive/100200300');
  });

  it('should execute animation commands (.p, .love, .love2, .-7)', async () => {
    const baseCtx = {
      chatId: 'chat_123',
      telegramChatId: BigInt('100200300'),
      businessConnectionId: 'bc_test_1',
      userId: 'user_123',
      callerTelegramId: BigInt('111222333'),
      isOwner: true,
      messageId: 200,
    };

    // .p
    const resP = await executeDotCommand({ ...baseCtx, parsed: parseAnyCommand('.p') });
    expect(resP.status).toBe('SUCCESS');
    expect(resP.responseMessage).toContain('SERKOGRAM CHAT AUTOMATION');

    // .love
    const resLove = await executeDotCommand({ ...baseCtx, parsed: parseAnyCommand('.love') });
    expect(resLove.status).toBe('SUCCESS');
    expect(resLove.responseMessage).toContain('Я тебя люблю!');

    // .love2
    const resLove2 = await executeDotCommand({ ...baseCtx, parsed: parseAnyCommand('.love2') });
    expect(resLove2.status).toBe('SUCCESS');
    expect(resLove2.responseMessage).toContain('Люблю тебя');

    // .-7
    const resMinus7 = await executeDotCommand({ ...baseCtx, parsed: parseAnyCommand('.-7') });
    expect(resMinus7.status).toBe('SUCCESS');
    expect(resMinus7.responseMessage).toContain('1000 - 7');
    expect(resMinus7.responseMessage).toContain('7 - 7 = 0');
  });

  it('should execute .tyuring test', async () => {
    const ctx: ExecuteDotCommandContext = {
      parsed: parseAnyCommand('.tyuring'),
      chatId: 'chat_123',
      telegramChatId: BigInt('100200300'),
      businessConnectionId: 'bc_test_1',
      userId: 'user_123',
      callerTelegramId: BigInt('111222333'),
      isOwner: true,
      messageId: 205,
    };

    const res = await executeDotCommand(ctx);
    expect(res.status).toBe('SUCCESS');
    expect(res.responseMessage).toContain('Тест Тьюринга');
  });

  it('should explicitly reject privacy-violating .dox and .deanon commands', async () => {
    const ctx: ExecuteDotCommandContext = {
      parsed: parseAnyCommand('.dox'),
      chatId: 'chat_123',
      telegramChatId: BigInt('100200300'),
      businessConnectionId: 'bc_test_1',
      userId: 'user_123',
      callerTelegramId: BigInt('111222333'),
      isOwner: true,
      messageId: 206,
    };

    const res = await executeDotCommand(ctx);
    expect(res.status).toBe('CANCELLED');
    expect(res.errorCode).toBe('COMMAND_DISABLED');
    expect(res.responseMessage).toContain('строго запрещён');
  });

  it('should track warnings with .warn and signal threshold', async () => {
    const ctx: ExecuteDotCommandContext = {
      parsed: parseAnyCommand('.warn Спам в чате'),
      chatId: 'chat_warn_test',
      telegramChatId: BigInt('100200300'),
      businessConnectionId: 'bc_test_1',
      userId: 'user_123',
      callerTelegramId: BigInt('111222333'),
      isOwner: true,
      messageId: 207,
    };

    const res = await executeDotCommand(ctx);
    expect(res.status).toBe('SUCCESS');
    expect(res.responseMessage).toContain('Предупреждение [1/3]');
  });

  it('should update auto-translate settings with .перевод', async () => {
    const ctx: ExecuteDotCommandContext = {
      parsed: parseAnyCommand('.перевод es'),
      chatId: 'chat_tr_test',
      telegramChatId: BigInt('100200300'),
      businessConnectionId: 'bc_test_1',
      userId: 'user_123',
      callerTelegramId: BigInt('111222333'),
      isOwner: true,
      messageId: 208,
    };

    const res = await executeDotCommand(ctx);
    expect(res.status).toBe('SUCCESS');
    expect(res.responseMessage).toContain('переключён на: <b>es</b>');
  });
});
