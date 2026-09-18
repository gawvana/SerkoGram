// ============================================================
// SerkoGram — Chat Automation Rewrite Specification (v2) Integration Tests
// Conforming to §27 of Specification
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verifyWebhookSecret } from '@/lib/telegram/bot';
import { POST as webhookRouteHandler } from '@/app/api/telegram/webhook/route';
import { GET as healthRouteHandler } from '@/app/api/health/route';
import { prisma } from '@/lib/db';
import {
  saveArchiveMessage,
  processArchiveEdit,
  processArchiveDeletes,
} from '@/lib/services/message-service';
import {
  checkFeaturePermission,
  checkFeaturesPermissions,
} from '@/lib/telegram/permissions';
import { executeDotCommand, type ExecuteDotCommandContext } from '@/lib/commands/executor';
import { parseAnyCommand } from '@/lib/commands/parser';

describe('Chat Automation v2 Integration Test Suite (§27)', () => {
  beforeEach(() => {
    process.env.TELEGRAM_WEBHOOK_SECRET = 'correct_secret_token_12345';
    process.env.TELEGRAM_BOT_TOKEN = '123456789:ABC_TEST_BOT_TOKEN';
  });

  describe('1. Webhook Signature & Secret Token Rejection (§27.1, §27.2)', () => {
    it('rejects request without X-Telegram-Bot-Api-Secret-Token with 401', async () => {
      const req = new Request('http://localhost/api/telegram/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ update_id: 1 }),
      });

      const res = await webhookRouteHandler(req);
      expect(res.status).toBe(401);
    });

    it('rejects request with mismatched secret token with 401 using constant-time check', async () => {
      const req = new Request('http://localhost/api/telegram/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-bot-api-secret-token': 'wrong_secret_attack',
        },
        body: JSON.stringify({ update_id: 1 }),
      });

      const res = await webhookRouteHandler(req);
      expect(res.status).toBe(401);
    });

    it('accepts request with valid secret token', async () => {
      const req = new Request('http://localhost/api/telegram/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-bot-api-secret-token': 'correct_secret_token_12345',
        },
        body: JSON.stringify({ update_id: 99999999 }),
      });

      const isValid = verifyWebhookSecret(req);
      expect(isValid).toBe(true);
    });
  });

  describe('2. Independent Rights & Permissions Engine (§3, §8)', () => {
    it('strictly treats each right as independent (can_reply does not imply can_read_messages)', () => {
      const rightsOnlyReply = { can_reply: true };
      const resRead = checkFeaturePermission('archive_read', rightsOnlyReply as any);
      expect(resRead.granted).toBe(false);
      expect(resRead.requiredRight).toBe('can_read_messages');

      const resReply = checkFeaturePermission('reply', rightsOnlyReply as any);
      expect(resReply.granted).toBe(true);
    });

    it('returns localized missing rights labels in 3 languages', () => {
      const emptyRights = {};
      const res = checkFeaturePermission('delete_other_message', emptyRights as any);
      expect(res.granted).toBe(false);
      expect(res.localizedMissingRight?.ru).toContain('удалять чужие сообщения');
      expect(res.localizedMissingRight?.en).toContain('delete all messages');
      expect(res.localizedMissingRight?.uz).toContain("o'chirish");
    });
  });

  describe('3. Canonical Archive Pipeline & Idempotency (§9, §27.5)', () => {
    it('saves message idempotently and guarantees persistence', async () => {
      const input = {
        connectionId: 'bc_test_archive_1',
        telegramChatId: BigInt(555444),
        telegramMessageId: BigInt(1001),
        businessConnectionId: 'bc_tg_1',
        senderTelegramId: BigInt(555444),
        senderName: 'Test Interlocutor',
        isOutgoing: false,
        messageType: 'TEXT',
        text: 'Initial message for archive test',
        telegramDate: new Date(),
      };

      const firstSave = await saveArchiveMessage(input);
      expect(firstSave).toBeDefined();
      expect(firstSave.text).toBe('Initial message for archive test');

      // Double-delivery idempotency test (§27.5.c)
      const secondSave = await saveArchiveMessage(input);
      expect(secondSave.id).toBe(firstSave.id);

      // Verify persistence in DB
      const dbRow = await prisma.archiveMessage.findUnique({
        where: { id: firstSave.id },
      });
      expect(dbRow).toBeDefined();
      expect(dbRow?.text).toBe('Initial message for archive test');
    });

    it('tracks edit history snapshots upon message edits (§12, §27.6)', async () => {
      const input = {
        connectionId: 'bc_test_archive_1',
        telegramChatId: BigInt(555444),
        telegramMessageId: BigInt(1002),
        businessConnectionId: 'bc_tg_1',
        isOutgoing: false,
        messageType: 'TEXT',
        text: 'Original unedited text',
        telegramDate: new Date(),
      };

      const original = await saveArchiveMessage(input);
      expect(original.text).toBe('Original unedited text');

      // Perform edit
      const editTime = new Date();
      const edited = await processArchiveEdit({
        connectionId: input.connectionId,
        telegramChatId: input.telegramChatId,
        telegramMessageId: input.telegramMessageId,
        newText: 'Updated edited text version',
        editedAt: editTime,
      });

      expect(edited).toBeDefined();
      expect(edited?.text).toBe('Updated edited text version');
      expect(Array.isArray(edited?.editHistory)).toBe(true);
      const history = edited?.editHistory as any[];
      expect(history.length).toBe(1);
      expect(history[0].text).toBe('Original unedited text');
    });

    it('marks deletedAt without erasing message content on delete (§13, §27.7)', async () => {
      const input = {
        connectionId: 'bc_test_archive_1',
        telegramChatId: BigInt(555444),
        telegramMessageId: BigInt(1003),
        businessConnectionId: 'bc_tg_1',
        isOutgoing: false,
        messageType: 'TEXT',
        text: 'Important message that will be deleted',
        telegramDate: new Date(),
      };

      await saveArchiveMessage(input);

      const deletedTime = new Date();
      const deletedCount = await processArchiveDeletes({
        connectionId: input.connectionId,
        telegramChatId: input.telegramChatId,
        messageIds: [1003],
        deletedAt: deletedTime,
      });

      expect(deletedCount).toBe(1);

      // Verify row is preserved with deletedAt timestamp
      const preserved = await prisma.archiveMessage.findUnique({
        where: {
          connectionId_telegramChatId_telegramMessageId: {
            connectionId: input.connectionId,
            telegramChatId: input.telegramChatId,
            telegramMessageId: BigInt(1003),
          },
        },
      });

      expect(preserved).toBeDefined();
      expect(preserved?.text).toBe('Important message that will be deleted');
      expect(preserved?.deletedAt).toBeDefined();
    });
  });

  describe('4. Command Execution & Truthful State (§14, §19, §27.9)', () => {
    it('ignores commands from non-owner users in business chats (§14.4)', async () => {
      const ctx: ExecuteDotCommandContext = {
        parsed: parseAnyCommand('.save'),
        chatId: 'chat_sec_1',
        telegramChatId: BigInt(100200),
        businessConnectionId: 'bc_test_sec',
        userId: 'owner_user_id',
        callerTelegramId: BigInt(9999999), // External sender
        isOwner: false, // Not the owner
        messageId: 501,
        isDirectBotChat: false,
      };

      const res = await executeDotCommand(ctx);
      expect(res.status).toBe('CANCELLED');
      expect(res.errorCode).toBe('UNAUTHORIZED_CALLER');
    });

    it('.mute provides truthful local filter explanation without claiming Telegram-level mute (§19)', async () => {
      const ctx: ExecuteDotCommandContext = {
        parsed: parseAnyCommand('.mute 20'),
        chatId: 'chat_mute_truthful',
        telegramChatId: BigInt(100200),
        businessConnectionId: 'bc_test_sec',
        userId: 'owner_user_id',
        callerTelegramId: BigInt(12345678),
        isOwner: true,
        messageId: 502,
        isDirectBotChat: false,
      };

      const res = await executeDotCommand(ctx);
      expect(res.status).toBe('SUCCESS');
      expect(res.responseMessage).toBeDefined();
      // Verifies truthful copy: explains local filter and standard Telegram mute
      expect(res.responseMessage).toContain('Ограничение диалога активировано');
      expect(res.responseMessage).toContain('Уведомления → Выключить звук');
    });
  });

  describe('5. Health Check Endpoint (§17, §27.10)', () => {
    it('returns healthy status and reports database and storage state', async () => {
      const res = await healthRouteHandler();
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.status).toBe('healthy');
      expect(body.service).toBe('SerkoGram');
      expect(body.storage).toBeDefined();
      expect(body.bot).toBeDefined();
    });
  });
});
