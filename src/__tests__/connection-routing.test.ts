// ============================================================
// SerkoGram — Connection Routing & Premium Check Test Suite
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { processUpdate } from '@/lib/telegram/webhook';
import { prisma } from '@/lib/db';
type Update = any;

describe('Connection Routing & Premium Detection', () => {
  beforeEach(() => {
    process.env.TELEGRAM_BOT_TOKEN = '123456789:ABC_TEST_TOKEN';
    process.env.TELEGRAM_BOT_USERNAME = 'SerkoGram_bot';
  });

  it('should detect Premium=true and assign PREMIUM_BUSINESS mode with full permissions', async () => {
    const connId = `bc_prem_${Date.now()}`;
    const tgUserId = 998877661;

    const update: Update = {
      update_id: 10001,
      business_connection: {
        id: connId,
        user: {
          id: tgUserId,
          first_name: 'PremiumUser',
          username: 'premium_user',
          is_premium: true,
        },
        user_chat_id: tgUserId,
        date: Math.floor(Date.now() / 1000),
        can_reply: true,
        is_enabled: true,
        rights: {
          can_reply: true,
          can_read_messages: true,
          can_delete_sent_messages: true,
          can_delete_all_messages: false,
        } as any,
      },
    };

    await processUpdate(update);

    // Verify User record
    const user = await prisma.user.findUnique({
      where: { telegramId: BigInt(tgUserId) },
    });
    expect(user).toBeDefined();
    expect(user?.isPremium).toBe(true);
    expect(user?.telegramPremium).toBe(true);

    // Verify BusinessConnection record
    const conn = await prisma.businessConnection.findUnique({
      where: { telegramConnectionId: connId },
    });
    expect(conn).toBeDefined();
    expect(conn?.status).toBe('ACTIVE');
    expect(conn?.isEnabled).toBe(true);
    expect(conn?.canReply).toBe(true);
    expect(conn?.telegramPremium).toBe(true);
    expect(conn?.connectionMode).toBe('PREMIUM_BUSINESS');
    expect((conn as any)?.canReadMessages).toBe(true);
    expect((conn as any)?.canDeleteSentMessages).toBe(true);
    expect((conn as any)?.canDeleteAllMessages).toBe(false);
  });

  it('should detect Premium=false and assign AUTOMATION_CHAT mode', async () => {
    const connId = `bc_nonprem_${Date.now()}`;
    const tgUserId = 998877662;

    const update: Update = {
      update_id: 10002,
      business_connection: {
        id: connId,
        user: {
          id: tgUserId,
          first_name: 'StandardUser',
          username: 'standard_user',
          is_premium: false,
        },
        user_chat_id: tgUserId,
        date: Math.floor(Date.now() / 1000),
        can_reply: true,
        is_enabled: true,
      },
    };

    await processUpdate(update);

    const user = await prisma.user.findUnique({
      where: { telegramId: BigInt(tgUserId) },
    });
    expect(user).toBeDefined();
    expect(user?.isPremium).toBe(false);
    expect(user?.telegramPremium).toBe(false);

    const conn = await prisma.businessConnection.findUnique({
      where: { telegramConnectionId: connId },
    });
    expect(conn).toBeDefined();
    expect(conn?.status).toBe('ACTIVE');
    expect(conn?.isEnabled).toBe(true);
    expect(conn?.canReply).toBe(true);
    expect(conn?.telegramPremium).toBe(false);
    expect(conn?.connectionMode).toBe('AUTOMATION_CHAT');
  });

  it('should keep telegramPremium as null without assuming false when is_premium is omitted', async () => {
    const connId = `bc_unknown_${Date.now()}`;
    const tgUserId = 998877663;

    const update: Update = {
      update_id: 10003,
      business_connection: {
        id: connId,
        user: {
          id: tgUserId,
          first_name: 'UnknownPremiumUser',
          username: 'unknown_premium',
          // is_premium is undefined
        },
        user_chat_id: tgUserId,
        date: Math.floor(Date.now() / 1000),
        can_reply: true,
        is_enabled: true,
      },
    };

    await processUpdate(update);

    const user = await prisma.user.findUnique({
      where: { telegramId: BigInt(tgUserId) },
    });
    expect(user).toBeDefined();
    expect(user?.telegramPremium).toBeNull();

    const conn = await prisma.businessConnection.findUnique({
      where: { telegramConnectionId: connId },
    });
    expect(conn).toBeDefined();
    expect(conn?.status).toBe('ACTIVE');
    expect(conn?.telegramPremium).toBeNull();
    expect(conn?.connectionMode).toBe('AUTOMATION_CHAT');
  });

  it('should gracefully handle disconnect update and mark isEnabled=false, status=DISCONNECTED', async () => {
    const connId = `bc_disconnect_${Date.now()}`;
    const tgUserId = 998877664;

    // First connect
    const connectUpdate: Update = {
      update_id: 10004,
      business_connection: {
        id: connId,
        user: {
          id: tgUserId,
          first_name: 'DisconnectUser',
          is_premium: true,
        },
        user_chat_id: tgUserId,
        date: Math.floor(Date.now() / 1000),
        can_reply: true,
        is_enabled: true,
      },
    };
    await processUpdate(connectUpdate);

    let conn = await prisma.businessConnection.findUnique({
      where: { telegramConnectionId: connId },
    });
    expect(conn?.status).toBe('ACTIVE');
    expect(conn?.isEnabled).toBe(true);

    // Then disconnect
    const disconnectUpdate: Update = {
      update_id: 10005,
      business_connection: {
        id: connId,
        user: {
          id: tgUserId,
          first_name: 'DisconnectUser',
          is_premium: true,
        },
        user_chat_id: tgUserId,
        date: Math.floor(Date.now() / 1000) + 10,
        can_reply: false,
        is_enabled: false,
      },
    };
    await processUpdate(disconnectUpdate);

    conn = await prisma.businessConnection.findUnique({
      where: { telegramConnectionId: connId },
    });
    expect(conn?.status).toBe('DISCONNECTED');
    expect(conn?.isEnabled).toBe(false);
    expect(conn?.disconnectedAt).toBeDefined();
  });
});
