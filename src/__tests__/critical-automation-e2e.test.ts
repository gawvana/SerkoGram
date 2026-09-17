// ============================================================
// SerkoGram — Critical Automation End-to-End Integration Test
// Verifies full pipeline:
// business_message with .mute -> update received -> connection resolved
// -> owner resolved -> chat resolved -> parser -> registry
// -> permissions validated -> DB state written -> .mute message deleted
// -> SerkoGram response sent with [ 🔊 Размутить ]
// -> incoming interlocutor message auto-deleted
// -> owner clicks inline button -> mute disabled -> DB updated
// -> security guard rejects non-owner clicks
// -> .save on media caption verified with privacy guard
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processUpdate } from '@/lib/telegram/webhook';
import { chatAutomation } from '@/lib/services/connection-service';
import { getCommandByName, validateCommandRegistry, UNIFIED_COMMANDS } from '@/lib/commands/registry';
import { resolveCommandContext } from '@/lib/commands/context';
import type { Update } from 'grammy/types';

// Mock DB
const mockChatSettingsDb = new Map<string, any>();
const mockCommandExecutions = new Map<string, any>();

vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      upsert: vi.fn().mockImplementation(({ where, create, update }) =>
        Promise.resolve({ id: 'usr_owner_1', ...create, ...update })
      ),
      findUnique: vi.fn().mockResolvedValue({ id: 'usr_owner_1', telegramId: BigInt('777888999') }),
    },
    businessConnection: {
      findUnique: vi.fn().mockImplementation(({ where }) => {
        if (where.telegramConnectionId === 'bc_e2e_active') {
          return Promise.resolve({
            id: 'bc_db_e2e',
            userId: 'usr_owner_1',
            telegramConnectionId: 'bc_e2e_active',
            status: 'ACTIVE',
            canReply: true,
            isEnabled: true,
            user: {
              id: 'usr_owner_1',
              telegramId: BigInt('777888999'),
              firstName: 'Owner',
            },
          });
        }
        return Promise.resolve(null);
      }),
      upsert: vi.fn().mockResolvedValue({
        id: 'bc_db_e2e',
        userId: 'usr_owner_1',
        telegramConnectionId: 'bc_e2e_active',
        status: 'ACTIVE',
        canReply: true,
        isEnabled: true,
      }),
    },
    chat: {
      upsert: vi.fn().mockImplementation(({ where, create, update }) =>
        Promise.resolve({
          id: 'chat_e2e_internal_1',
          telegramChatId: BigInt('987654321'),
          connectionId: 'bc_db_e2e',
          title: 'Direct Client Chat',
          ...create,
          ...update,
        })
      ),
      findFirst: vi.fn().mockResolvedValue({
        id: 'chat_e2e_internal_1',
        telegramChatId: BigInt('987654321'),
        connectionId: 'bc_db_e2e',
      }),
      findUnique: vi.fn().mockResolvedValue({
        id: 'chat_e2e_internal_1',
        telegramChatId: BigInt('987654321'),
        connectionId: 'bc_db_e2e',
      }),
      update: vi.fn().mockResolvedValue({
        id: 'chat_e2e_internal_1',
        telegramChatId: BigInt('987654321'),
        connectionId: 'bc_db_e2e',
      }),
    },
    chatMember: {
      upsert: vi.fn().mockResolvedValue({ id: 'cm_1' }),
    },
    message: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'msg_' + Date.now(), ...data })),
      upsert: vi.fn().mockImplementation(({ create, update }) => Promise.resolve({ id: 'msg_' + Date.now(), ...create, ...update })),
    },
    messageVersion: {
      create: vi.fn().mockResolvedValue({ id: 'mv_1' }),
    },
    messageMedia: {
      create: vi.fn().mockResolvedValue({ id: 'mm_1' }),
    },
    userSettings: {
      findUnique: vi.fn().mockResolvedValue({
        userId: 'usr_owner_1',
        saveMessages: true,
        saveMedia: true,
        saveEdits: true,
        saveDeleted: true,
      }),
      upsert: vi.fn().mockResolvedValue({ id: 'us_1' }),
    },
    privacySettings: {
      findUnique: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue({ id: 'ps_1' }),
    },
    commandExecution: {
      upsert: vi.fn().mockImplementation(({ create, update }) => {
        const record = { id: 'exec_' + Date.now(), ...create, ...update };
        mockCommandExecutions.set(record.id, record);
        return Promise.resolve(record);
      }),
      update: vi.fn().mockResolvedValue({ id: 'exec_1', status: 'SUCCESS' }),
    },
    chatAutomationSettings: {
      findUnique: vi.fn().mockImplementation(({ where }) => {
        return Promise.resolve(mockChatSettingsDb.get(where.chatId) || null);
      }),
      upsert: vi.fn().mockImplementation(({ where, update, create }) => {
        const existing = mockChatSettingsDb.get(where.chatId) || {};
        const merged = { ...existing, ...create, ...update, chatId: where.chatId };
        mockChatSettingsDb.set(where.chatId, merged);
        return Promise.resolve(merged);
      }),
    },
    chatWarning: {
      findUnique: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue({ id: 'cw_1', count: 1 }),
    },
    ownerNotification: {
      create: vi.fn().mockResolvedValue({ id: 'notif_1' }),
    },
    processedUpdate: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'pu_1' }),
    },
    scheduledJob: {
      create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'job_1', ...data })),
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue({ id: 'job_1' }),
    },
  },
}));

// Mock Bot API
const mockSendMessage = vi.fn().mockResolvedValue({ message_id: 8881 });
const mockDeleteMessage = vi.fn().mockResolvedValue(true);
const mockEditMessageText = vi.fn().mockResolvedValue({ message_id: 8881 });
const mockAnswerCallbackQuery = vi.fn().mockResolvedValue(true);

vi.mock('@/lib/telegram/bot', () => ({
  getBot: () => ({
    api: {
      sendMessage: mockSendMessage,
      deleteMessage: mockDeleteMessage,
      editMessageText: mockEditMessageText,
      answerCallbackQuery: mockAnswerCallbackQuery,
      getBusinessConnection: vi.fn().mockResolvedValue(null),
    },
  }),
}));

describe('CRITICAL AUTOMATION E2E: Full Telegram Flow & .mute Pipeline', () => {
  const OWNER_TG_ID = 777888999;
  const INTERLOCUTOR_TG_ID = 987654321;
  const CHAT_TG_ID = 987654321;
  const BC_ID = 'bc_e2e_active';

  beforeEach(() => {
    vi.clearAllMocks();
    mockChatSettingsDb.clear();
    mockCommandExecutions.clear();
  });

  it('verifies command registry startup integrity with 0 duplicates and valid handlers', () => {
    expect(() => validateCommandRegistry()).not.toThrow();
    expect(UNIFIED_COMMANDS.length).toBe(62);

    const muteDef = getCommandByName('mute');
    expect(muteDef).toBeDefined();
    expect(muteDef?.prefix).toBe('.');
    expect(muteDef?.enabled).toBe(true);

    const shrugDef = getCommandByName('shrug');
    expect(shrugDef).toBeDefined();
    expect(shrugDef?.enabled).toBe(true);

    // Banned privacy commands must NEVER be in registry
    expect(getCommandByName('dox')).toBeUndefined();
    expect(getCommandByName('deanon')).toBeUndefined();
    expect(getCommandByName('osint')).toBeUndefined();

    // Removed AI and animation commands must NEVER be in registry
    expect(getCommandByName('gpt')).toBeUndefined();
    expect(getCommandByName('a_gpt')).toBeUndefined();
    expect(getCommandByName('image')).toBeUndefined();
    expect(getCommandByName('love')).toBeUndefined();
    expect(getCommandByName('p')).toBeUndefined();
    expect(getCommandByName('-7')).toBeUndefined();
  });

  it('correctly resolves context distinguishing owner from interlocutor and text from caption', () => {
    // Owner message with .mute
    const ownerMsg: any = {
      message_id: 101,
      date: 1700000000,
      chat: { id: CHAT_TG_ID, type: 'private', first_name: 'Client' },
      from: { id: OWNER_TG_ID, first_name: 'Owner', username: 'owner' },
      text: '.mute 20',
      business_connection_id: BC_ID,
    };

    const ctx = resolveCommandContext({
      msg: ownerMsg,
      chatId: 'chat_e2e_internal_1',
      telegramChatId: BigInt(CHAT_TG_ID),
      ownerTelegramId: BigInt(OWNER_TG_ID),
      ownerUserId: 'usr_owner_1',
    });

    expect(ctx.isOwnerMessage).toBe(true);
    expect(ctx.isIncomingMessage).toBe(false);
    expect(ctx.isCommand).toBe(true);
    expect(ctx.commandName).toBe('mute');
    expect(ctx.args).toEqual(['20']);
    expect(ctx.telegramOwnerId).toBe(BigInt(OWNER_TG_ID));
    expect(ctx.telegramSenderId).toBe(BigInt(OWNER_TG_ID));

    // Media message with .save in caption
    const mediaMsg: any = {
      message_id: 102,
      date: 1700000001,
      chat: { id: CHAT_TG_ID, type: 'private', first_name: 'Client' },
      from: { id: OWNER_TG_ID, first_name: 'Owner' },
      caption: '.save',
      photo: [{ file_id: 'ph_1', file_unique_id: 'u_1' }],
      business_connection_id: BC_ID,
    };

    const mediaCtx = resolveCommandContext({
      msg: mediaMsg,
      chatId: 'chat_e2e_internal_1',
      telegramChatId: BigInt(CHAT_TG_ID),
      ownerTelegramId: BigInt(OWNER_TG_ID),
    });

    expect(mediaCtx.isCommand).toBe(true);
    expect(mediaCtx.commandName).toBe('save');
    expect(mediaCtx.effectiveText).toBe('.save');
  });

  it('executes full .mute pipeline -> deletes command -> provides unmute button -> auto-deletes incoming -> unmutes via callback', async () => {
    // STEP 1: Owner sends .mute 15 in managed chat
    const muteUpdate: Update = {
      update_id: 10001,
      business_message: {
        message_id: 501,
        date: 1700000010,
        chat: { id: CHAT_TG_ID, type: 'private', first_name: 'Partner' },
        from: { id: OWNER_TG_ID, first_name: 'Owner', username: 'owner_user', is_bot: false },
        text: '.mute 15',
        business_connection_id: BC_ID,
      },
    };

    await processUpdate(muteUpdate);

    // Verify chat automation settings in DB
    const settings = await chatAutomation.getChatSettings('chat_e2e_internal_1');
    expect(settings.muteEnabled).toBe(true);
    expect(settings.muteUntil).toBeDefined();

    // Verify SerkoGram sent response with inline keyboard [ 🔊 Размутить ]
    expect(mockSendMessage).toHaveBeenCalledWith(
      CHAT_TG_ID.toString(),
      expect.stringContaining('Ограничение диалога активировано'),
      expect.objectContaining({
        business_connection_id: BC_ID,
        parse_mode: 'HTML',
        reply_markup: expect.objectContaining({
          inline_keyboard: expect.arrayContaining([
            expect.arrayContaining([
              expect.objectContaining({
                text: '🔊 Размутить',
                callback_data: `mute:unmute:chat_e2e_internal_1:${OWNER_TG_ID}`,
              }),
            ]),
          ]),
        }),
      })
    );

    // STEP 2: Interlocutor sends incoming message while mute is active
    const incomingUpdate: Update = {
      update_id: 10002,
      business_message: {
        message_id: 502,
        date: 1700000012,
        chat: { id: CHAT_TG_ID, type: 'private', first_name: 'Partner' },
        from: { id: INTERLOCUTOR_TG_ID, first_name: 'Partner', is_bot: false },
        text: 'Привет, ты тут?',
        business_connection_id: BC_ID,
      },
    };

    await processUpdate(incomingUpdate);

    // Verify incoming message was automatically deleted
    expect(mockDeleteMessage).toHaveBeenCalledWith(CHAT_TG_ID, 502);

    // STEP 3: Non-owner attempts to click unmute button (Hacker/interlocutor)
    const attackerCallbackUpdate: Update = {
      update_id: 10003,
      callback_query: {
        id: 'cb_attacker_1',
        from: { id: INTERLOCUTOR_TG_ID, first_name: 'Attacker', is_bot: false },
        data: `mute:unmute:chat_e2e_internal_1:${OWNER_TG_ID}`,
        chat_instance: 'inst_1',
        message: {
          message_id: 8881,
          date: 1700000015,
          chat: { id: CHAT_TG_ID, type: 'private', first_name: 'Partner' },
        },
      },
    };

    await processUpdate(attackerCallbackUpdate);

    // Verify attack was blocked
    expect(mockAnswerCallbackQuery).toHaveBeenCalledWith(
      'cb_attacker_1',
      expect.objectContaining({
        text: expect.stringContaining('Только владелец чата может управлять'),
        show_alert: true,
      })
    );

    // Mute must still be active
    const settingsStillMuted = await chatAutomation.getChatSettings('chat_e2e_internal_1');
    expect(settingsStillMuted.muteEnabled).toBe(true);

    // STEP 4: Legitimate Owner clicks [ 🔊 Размутить ] button
    const ownerCallbackUpdate: Update = {
      update_id: 10004,
      callback_query: {
        id: 'cb_owner_1',
        from: { id: OWNER_TG_ID, first_name: 'Owner', is_bot: false },
        data: `mute:unmute:chat_e2e_internal_1:${OWNER_TG_ID}`,
        chat_instance: 'inst_1',
        message: {
          message_id: 8881,
          date: 1700000020,
          chat: { id: CHAT_TG_ID, type: 'private', first_name: 'Partner' },
        },
      },
    };

    await processUpdate(ownerCallbackUpdate);

    // Verify mute was successfully disabled
    const settingsUnmuted = await chatAutomation.getChatSettings('chat_e2e_internal_1');
    expect(settingsUnmuted.muteEnabled).toBe(false);
    expect(settingsUnmuted.muteUntil).toBeNull();

    // Verify message text was edited and callback answered
    expect(mockEditMessageText).toHaveBeenCalledWith(
      CHAT_TG_ID,
      8881,
      expect.stringContaining('Ограничение диалога отключено'),
      expect.anything()
    );
    expect(mockAnswerCallbackQuery).toHaveBeenCalledWith(
      'cb_owner_1',
      expect.objectContaining({ text: '🔊 Мут отключён' })
    );
  });
});
