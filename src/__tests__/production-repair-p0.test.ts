// ============================================================
// SerkoGram — Production Repair P0 Test Suite
// Zero-Trust verification of:
// 1. Structured downloadAndStoreMedia (no void / no silent failure)
// 2. Canonical extractTelegramMedia
// 3. Universal .save (Text & Media archive)
// 4. Command Message Cleanup (target msg self-protection)
// 5. Zero-Trust Callback Authorization (Anti-IDOR)
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  extractTelegramMedia,
  downloadAndStoreMedia,
} from '@/lib/services/media-service';
import { saveEphemeralMedia } from '@/lib/services/ephemeral-service';
import { executeDotCommand } from '@/lib/commands/executor';
import { prisma } from '@/lib/db';
import { getBot } from '@/lib/telegram/bot';
import { getStorage } from '@/lib/services/storage-service';

vi.mock('@/lib/db', () => ({
  prisma: {
    messageMedia: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
    message: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      create: vi.fn(),
    },
    chat: {
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
    chatAutomationSettings: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    commandExecution: {
      create: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
      upsert: vi.fn().mockResolvedValue({ id: 'exec_1' }),
      findFirst: vi.fn(),
    },
  },
}));

vi.mock('@/lib/telegram/bot', () => {
  const mockApi = {
    sendMessage: vi.fn().mockResolvedValue({ message_id: 888 }),
    deleteMessage: vi.fn().mockResolvedValue(true),
    deleteBusinessMessages: vi.fn().mockResolvedValue(true),
    getFile: vi.fn(),
    answerCallbackQuery: vi.fn().mockResolvedValue(true),
    editMessageText: vi.fn().mockResolvedValue(true),
  };
  return {
    getBot: vi.fn(() => ({ api: mockApi })),
    bot: { api: mockApi },
  };
});

vi.mock('@/lib/services/storage-service', () => ({
  getStorage: vi.fn(() => ({
    upload: vi.fn().mockResolvedValue({
      url: 'https://storage.serkogram.app/media/test.jpg',
      path: 'media/test.jpg',
    }),
  })),
}));

vi.mock('@/lib/services/owner-notification-service', () => ({
  ownerNotificationService: {
    notifyArchiveSuccess: vi.fn().mockResolvedValue({ success: true }),
    notifyEphemeralSaved: vi.fn().mockResolvedValue({ success: true }),
    notifyArchiveFailure: vi.fn().mockResolvedValue({ success: true }),
    notifyCommandResult: vi.fn().mockResolvedValue({ success: true }),
  },
}));

describe('SerkoGram P0 Production Repair Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TELEGRAM_BOT_TOKEN = 'test_token_123';
  });

  describe('1. Canonical extractTelegramMedia', () => {
    it('should correctly extract highest resolution photo and ephemeral flags', () => {
      const tgMsg = {
        photo: [
          { file_id: 'p1', file_unique_id: 'pu1', file_size: 100, width: 320, height: 240 },
          { file_id: 'p2', file_unique_id: 'pu2', file_size: 500, width: 1280, height: 960 },
        ],
        ttl_seconds: 10,
        is_view_once: true,
      };

      const extracted = extractTelegramMedia(tgMsg);
      expect(extracted).not.toBeNull();
      expect(extracted?.mediaType).toBe('PHOTO');
      expect(extracted?.fileId).toBe('p2');
      expect(extracted?.fileUniqueId).toBe('pu2');
      expect(extracted?.width).toBe(1280);
      expect(extracted?.isViewOnce).toBe(true);
      expect(extracted?.isEphemeral).toBe(true);
      expect(extracted?.ttlSeconds).toBe(10);
    });

    it('should correctly extract video note and audio', () => {
      const vnoteMsg = {
        video_note: {
          file_id: 'vn_1',
          file_unique_id: 'vnu_1',
          length: 360,
          duration: 15,
          file_size: 2048,
        },
      };
      const extractedVnote = extractTelegramMedia(vnoteMsg);
      expect(extractedVnote?.mediaType).toBe('VIDEO_NOTE');
      expect(extractedVnote?.fileId).toBe('vn_1');
      expect(extractedVnote?.duration).toBe(15);

      const audioMsg = {
        audio: {
          file_id: 'aud_1',
          file_unique_id: 'audu_1',
          file_name: 'track.mp3',
          mime_type: 'audio/mpeg',
          duration: 180,
          file_size: 5000,
        },
      };
      const extractedAudio = extractTelegramMedia(audioMsg);
      expect(extractedAudio?.mediaType).toBe('AUDIO');
      expect(extractedAudio?.fileName).toBe('track.mp3');
    });

    it('should return null for plain text message without media', () => {
      const textMsg = { text: 'Hello world', date: 1700000000 };
      expect(extractTelegramMedia(textMsg)).toBeNull();
    });
  });

  describe('2. Structured downloadAndStoreMedia (No Silent Failure)', () => {
    it('should return ALREADY_SAVED if media was already archived', async () => {
      (prisma.messageMedia.findUnique as any).mockResolvedValue({
        id: 'fu_existing',
        isDownloaded: true,
        storageUrl: 'https://blob/existing.jpg',
        storagePath: 'media/existing.jpg',
      });

      const result = await downloadAndStoreMedia('msg_1', 'f_1', 'fu_existing', 'photo');
      expect(result.success).toBe(true);
      expect(result.status).toBe('ALREADY_SAVED');
      expect(result.storageUrl).toBe('https://blob/existing.jpg');
    });

    it('should return TELEGRAM_FILE_ERROR if getFile fails', async () => {
      (prisma.messageMedia.findUnique as any).mockResolvedValue(null);
      const bot = getBot();
      (bot.api.getFile as any).mockRejectedValue(new Error('Bad Request: file is too big'));

      const result = await downloadAndStoreMedia('msg_1', 'f_large', 'fu_large', 'video');
      expect(result.success).toBe(false);
      expect(result.status).toBe('TELEGRAM_FILE_ERROR');
      expect(result.errorCode).toBe('TELEGRAM_FILE_ERROR');
      expect(result.error).toContain('file is too big');
    });

    it('should return SAVED and storage URL on successful download and upload', async () => {
      (prisma.messageMedia.findUnique as any).mockResolvedValue(null);
      const bot = getBot();
      (bot.api.getFile as any).mockResolvedValue({ file_path: 'photos/file_0.jpg' });

      // Mock global fetch for download
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        arrayBuffer: async () => new Uint8Array([1, 2, 3, 4]).buffer,
      }) as any;

      (prisma.messageMedia.upsert as any).mockResolvedValue({
        id: 'fu_saved',
        storageUrl: 'https://storage.serkogram.app/media/test.jpg',
      });
      (prisma.message.findUnique as any).mockResolvedValue({ chatId: 'c_1' });

      const result = await downloadAndStoreMedia('msg_1', 'f_ok', 'fu_saved', 'photo', {
        mimeType: 'image/jpeg',
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe('SAVED');
      expect(result.mediaId).toBe('fu_saved');
      expect(result.storageUrl).toBe('https://storage.serkogram.app/media/test.jpg');

      global.fetch = originalFetch;
    });
  });

  describe('3. Universal .save (Text & Media)', () => {
    it('should successfully save a replied text message to permanent archive', async () => {
      (prisma.message.findUnique as any).mockResolvedValue(null);
      (prisma.message.upsert as any).mockResolvedValue({
        id: 'msg_text_saved',
        text: 'Important message text',
      });

      const replyToObj = {
        message_id: 555,
        text: 'Important message text',
        date: 1700000000,
      };

      const res = await saveEphemeralMedia('chat_1', 555, 'user_owner', replyToObj);
      expect(res.success).toBe(true);
      expect(res.archiveStatus).toBe('ARCHIVED');
      expect(res.message).toContain('Текстовое сообщение успешно сохранено');
    });

    it('should download and save media even if it was not previously auto-saved', async () => {
      (prisma.message.findUnique as any).mockResolvedValue(null);
      (prisma.message.upsert as any).mockResolvedValue({
        id: 'msg_media_saved',
      });

      const bot = getBot();
      (bot.api.getFile as any).mockResolvedValue({ file_path: 'photos/photo.jpg' });

      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
      }) as any;

      (prisma.messageMedia.upsert as any).mockResolvedValue({
        id: 'pu_direct',
        storageUrl: 'https://storage.serkogram.app/media/test.jpg',
      });
      (prisma.messageMedia.findFirst as any).mockResolvedValue({
        id: 'pu_direct',
        isDownloaded: true,
      });

      const replyToObj = {
        message_id: 777,
        photo: [{ file_id: 'p_direct', file_unique_id: 'pu_direct', file_size: 400 }],
        date: 1700000000,
      };

      const res = await saveEphemeralMedia('chat_1', 777, 'user_owner', replyToObj);
      expect(res.success).toBe(true);
      expect(res.archiveStatus).toBe('ARCHIVED');
      expect(res.media).toBeDefined();

      global.fetch = originalFetch;
    });
  });

  describe('4. Command Message Cleanup & Target Message Self-Protection', () => {
    it('should clean up the command message and NEVER clean the target replied message', async () => {
      const bot = getBot();

      const result = await executeDotCommand({
        chatId: 'chat_internal_1',
        telegramChatId: BigInt(-10012345678),
        businessConnectionId: 'bc_test_1',
        userId: 'user_owner',
        callerTelegramId: BigInt(111222333),
        isOwner: true,
        messageId: 9999,
        replyToMessageId: 1234,
        parsed: {
          isCommand: true,
          prefix: '.',
          command: 'save',
          arguments: [],
          rawArguments: '',
          chatId: 'chat_internal_1',
          senderId: 111222333,
          replyToMessageId: 1234,
        },
      });

      expect(result.status).toBe('SUCCESS');
      expect(result.cleanupStatus).toBe('CLEANED');

      expect((bot.api as any).deleteBusinessMessages).toHaveBeenCalledWith(
        'bc_test_1',
        [9999]
      );
      expect((bot.api as any).deleteBusinessMessages).not.toHaveBeenCalledWith(
        'bc_test_1',
        [1234]
      );
    });

    it('should record warning if cleanup fails without failing the main command', async () => {
      const bot = getBot();
      (bot.api as any).deleteBusinessMessages.mockRejectedValueOnce(
        new Error('Message cannot be deleted')
      );
      (bot.api.deleteMessage as any).mockRejectedValueOnce(
        new Error('Message cannot be deleted')
      );

      const result = await executeDotCommand({
        chatId: 'chat_internal_1',
        telegramChatId: BigInt(-10012345678),
        businessConnectionId: 'bc_test_fail',
        userId: 'user_owner',
        callerTelegramId: BigInt(111222333),
        isOwner: true,
        messageId: 8888,
        parsed: {
          isCommand: true,
          prefix: '.',
          command: 'weather',
          arguments: ['London'],
          rawArguments: 'London',
          chatId: 'chat_internal_1',
          senderId: 111222333,
        },
      });

      expect(result.status).toBe('SUCCESS');
      expect(result.cleanupStatus).toBe('FAILED');
      expect(result.errorCode).toContain('CLEANUP_WARNING');
    });
  });

  describe('5. Zero-Trust Callback Authorization (Anti-IDOR)', () => {
    it('should block callback action if caller does not own the chat in DB', async () => {
      const { processUpdate } = await import('@/lib/telegram/webhook');
      const bot = getBot();

      // Chat belongs to owner with telegramId '111222333'
      (prisma.chat.findUnique as any).mockResolvedValue({
        id: 'chat_target_1',
        connection: {
          user: {
            telegramId: BigInt(111222333),
          },
        },
      });

      // Attacker tries to trigger unmute by forging callback_data with their own telegramId '999888777'
      const forgedUpdate: any = {
        update_id: 10001,
        callback_query: {
          id: 'cb_attack_1',
          from: { id: 999888777, first_name: 'Attacker' },
          message: { message_id: 100, chat: { id: 999888777 } },
          data: 'mute:unmute:chat_target_1:999888777',
        },
      };

      await processUpdate(forgedUpdate);

      // Verify attacker was blocked with an alert
      expect(bot.api.answerCallbackQuery).toHaveBeenCalledWith(
        'cb_attack_1',
        expect.objectContaining({
          text: expect.stringContaining('Только владелец чата может управлять этим режимом'),
          show_alert: true,
        })
      );
    });
  });
});