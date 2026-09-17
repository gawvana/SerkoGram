// ============================================================
// SerkoGram — Media Save Pipeline & Verification Test Suite
// ============================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  downloadAndStoreMedia,
  extractTelegramMedia,
  generateSignedMediaToken,
  validateSignedMediaToken,
  getAuthorizedMediaItem,
} from '@/lib/services/media-service';
import { saveEphemeralMedia } from '@/lib/services/ephemeral-service';
import { prisma } from '@/lib/db';
import * as botModule from '@/lib/telegram/bot';
import * as storageModule from '@/lib/services/storage-service';

describe('Media Save Pipeline & Strict Verification', () => {
  const userId = 'usr_media_tester_1';
  const chatId = 'chat_media_tester_1';
  const telegramChatId = 123456789;

  beforeEach(async () => {
    process.env.SESSION_SECRET = 'a_very_secure_test_session_secret_that_is_at_least_32_characters_long';
    process.env.TELEGRAM_BOT_TOKEN = '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11';
    process.env.NEXT_PUBLIC_APP_URL = 'https://serkogram.vercel.app';

    // Seed test connection and chat in DB
    await prisma.user.upsert({
      where: { id: userId },
      create: {
        id: userId,
        telegramId: BigInt(telegramChatId),
        firstName: 'MediaTester',
      },
      update: {},
    });

    const conn = await prisma.businessConnection.upsert({
      where: { id: 'conn_media_1' },
      create: {
        id: 'conn_media_1',
        userId,
        telegramConnectionId: 'tg_conn_media_1',
        type: 'BUSINESS',
        status: 'ACTIVE',
      },
      update: {},
    });

    await prisma.chat.upsert({
      where: { id: chatId },
      create: {
        id: chatId,
        telegramChatId: BigInt(telegramChatId),
        connectionId: conn.id,
        title: 'Test Media Chat',
        chatType: 'private',
      },
      update: {},
    });
  });

  it('should extract all 8 Telegram media types correctly', () => {
    // 1. Photo
    const photoMsg = {
      photo: [
        { file_id: 'ph_small', file_unique_id: 'u_ph_small', file_size: 100 },
        { file_id: 'ph_large', file_unique_id: 'u_ph_large', file_size: 5000, width: 1280, height: 720 },
      ],
    };
    const extractedPhoto = extractTelegramMedia(photoMsg);
    expect(extractedPhoto?.mediaType).toBe('PHOTO');
    expect(extractedPhoto?.fileId).toBe('ph_large');
    expect(extractedPhoto?.mimeType).toBe('image/jpeg');

    // 2. Video
    const videoMsg = {
      video: {
        file_id: 'vid_1',
        file_unique_id: 'u_vid_1',
        mime_type: 'video/mp4',
        duration: 30,
        file_size: 20000,
      },
    };
    const extractedVideo = extractTelegramMedia(videoMsg);
    expect(extractedVideo?.mediaType).toBe('VIDEO');
    expect(extractedVideo?.duration).toBe(30);

    // 3. Document
    const docMsg = {
      document: {
        file_id: 'doc_1',
        file_unique_id: 'u_doc_1',
        file_name: 'report.pdf',
        mime_type: 'application/pdf',
        file_size: 15000,
      },
    };
    const extractedDoc = extractTelegramMedia(docMsg);
    expect(extractedDoc?.mediaType).toBe('DOCUMENT');
    expect(extractedDoc?.fileName).toBe('report.pdf');

    // 4. Audio
    const audioMsg = {
      audio: {
        file_id: 'aud_1',
        file_unique_id: 'u_aud_1',
        file_name: 'song.mp3',
        mime_type: 'audio/mpeg',
        duration: 180,
      },
    };
    const extractedAudio = extractTelegramMedia(audioMsg);
    expect(extractedAudio?.mediaType).toBe('AUDIO');

    // 5. Voice
    const voiceMsg = {
      voice: {
        file_id: 'voc_1',
        file_unique_id: 'u_voc_1',
        mime_type: 'audio/ogg',
        duration: 12,
      },
    };
    const extractedVoice = extractTelegramMedia(voiceMsg);
    expect(extractedVoice?.mediaType).toBe('VOICE');

    // 6. Video Note
    const roundMsg = {
      video_note: {
        file_id: 'vn_1',
        file_unique_id: 'u_vn_1',
        length: 360,
        duration: 10,
      },
    };
    const extractedVN = extractTelegramMedia(roundMsg);
    expect(extractedVN?.mediaType).toBe('VIDEO_NOTE');

    // 7. Animation (GIF)
    const animMsg = {
      animation: {
        file_id: 'anim_1',
        file_unique_id: 'u_anim_1',
        mime_type: 'video/mp4',
        duration: 5,
      },
    };
    const extractedAnim = extractTelegramMedia(animMsg);
    expect(extractedAnim?.mediaType).toBe('ANIMATION');

    // 8. Sticker
    const stickerMsg = {
      sticker: {
        file_id: 'stk_1',
        file_unique_id: 'u_stk_1',
        is_animated: false,
        is_video: false,
      },
    };
    const extractedSticker = extractTelegramMedia(stickerMsg);
    expect(extractedSticker?.mediaType).toBe('STICKER');
  });

  it('should strictly return SAVED only after 7-stage verification passes', async () => {
    const messageId = `msg_test_${Date.now()}`;
    const fileId = 'file_ok_123';
    const fileUniqueId = `uniq_${Date.now()}`;

    // Create message record
    await prisma.message.create({
      data: {
        id: messageId,
        chatId,
        telegramMessageId: 101,
        telegramDate: new Date(),
        messageType: 'PHOTO',
      },
    });

    // Mock bot.api.getFile
    const mockBot = {
      api: {
        getFile: vi.fn().mockResolvedValue({ file_id: fileId, file_path: 'photos/file_1.jpg' }),
      },
    };
    vi.spyOn(botModule, 'getBot').mockReturnValue(mockBot as any);

    // Mock global fetch for download
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      arrayBuffer: async () => new ArrayBuffer(1024),
    });
    vi.stubGlobal('fetch', mockFetch);

    // Mock storage
    const mockStorage = {
      isConfigured: () => true,
      upload: vi.fn().mockResolvedValue({
        url: 'https://store_mock.public.blob.vercel-storage.com/media/file_1.jpg',
        path: 'media/test/file_1.jpg',
      }),
    };
    vi.spyOn(storageModule, 'getStorage').mockReturnValue(mockStorage as any);

    const result = await downloadAndStoreMedia(messageId, fileId, fileUniqueId, 'photo', {
      fileName: 'file_1.jpg',
      mimeType: 'image/jpeg',
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe('SAVED');
    expect(result.storageUrl).toContain('https://');
    expect(result.mediaId).toBeDefined();

    // Verify round-trip readback from DB
    const mediaInDb = await prisma.messageMedia.findUnique({
      where: { id: result.mediaId },
    });
    expect(mediaInDb).toBeDefined();
    expect(mediaInDb?.isDownloaded).toBe(true);
    expect(mediaInDb?.storageUrl).toBe(result.storageUrl);

    // Verify authorized access helper
    const authMedia = await getAuthorizedMediaItem(result.mediaId!, userId);
    expect(authMedia).toBeDefined();
    expect(authMedia?.id).toBe(result.mediaId);
  });

  it('should return STORAGE_SAVED_LINK_BROKEN if storage succeeded but readback cannot resolve link', async () => {
    const messageId = `msg_broken_${Date.now()}`;
    const fileId = 'file_broken_123';
    const fileUniqueId = `uniq_broken_${Date.now()}`;

    await prisma.message.create({
      data: {
        id: messageId,
        chatId,
        telegramMessageId: 102,
        telegramDate: new Date(),
        messageType: 'PHOTO',
      },
    });

    const mockBot = {
      api: {
        getFile: vi.fn().mockResolvedValue({ file_id: fileId, file_path: 'photos/broken.jpg' }),
      },
    };
    vi.spyOn(botModule, 'getBot').mockReturnValue(mockBot as any);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      arrayBuffer: async () => new ArrayBuffer(512),
    }));

    // Mock storage with invalid non-HTTP URL
    const mockStorage = {
      isConfigured: () => true,
      upload: vi.fn().mockResolvedValue({
        url: '', // Empty URL simulates broken link
        path: 'media/test/broken.jpg',
      }),
    };
    vi.spyOn(storageModule, 'getStorage').mockReturnValue(mockStorage as any);

    const result = await downloadAndStoreMedia(messageId, fileId, fileUniqueId, 'photo');

    expect(result.success).toBe(false);
    expect(result.status).toBe('STORAGE_SAVED_LINK_BROKEN');
    expect(result.error).toContain('Медиа сохранено');
  });

  it('should return FAILED and never SAVED when storage upload fails', async () => {
    const messageId = `msg_fail_${Date.now()}`;
    const fileId = 'file_fail_123';
    const fileUniqueId = `uniq_fail_${Date.now()}`;

    await prisma.message.create({
      data: {
        id: messageId,
        chatId,
        telegramMessageId: 103,
        telegramDate: new Date(),
        messageType: 'PHOTO',
      },
    });

    const mockBot = {
      api: {
        getFile: vi.fn().mockResolvedValue({ file_id: fileId, file_path: 'photos/fail.jpg' }),
      },
    };
    vi.spyOn(botModule, 'getBot').mockReturnValue(mockBot as any);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      arrayBuffer: async () => new ArrayBuffer(512),
    }));

    const mockStorage = {
      isConfigured: () => true,
      upload: vi.fn().mockRejectedValue(new Error('Network upload error to blob store')),
    };
    vi.spyOn(storageModule, 'getStorage').mockReturnValue(mockStorage as any);

    const result = await downloadAndStoreMedia(messageId, fileId, fileUniqueId, 'photo');

    expect(result.success).toBe(false);
    expect(result.status).toBe('STORAGE_ERROR');
    expect(result.error).toContain('Network upload error');
  });

  it('should handle repeated save: first SAVED, then ALREADY_SAVED with working link', async () => {
    const replyMsgId = 201;
    const rawReply = {
      message_id: replyMsgId,
      date: Math.floor(Date.now() / 1000),
      photo: [
        { file_id: 'repeat_ph', file_unique_id: `u_repeat_${Date.now()}`, file_size: 4000 },
      ],
    };

    const mockBot = {
      api: {
        getFile: vi.fn().mockResolvedValue({ file_id: 'repeat_ph', file_path: 'photos/repeat.jpg' }),
      },
    };
    vi.spyOn(botModule, 'getBot').mockReturnValue(mockBot as any);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      arrayBuffer: async () => new ArrayBuffer(1024),
    }));

    const mockStorage = {
      isConfigured: () => true,
      upload: vi.fn().mockResolvedValue({
        url: 'https://store_mock.public.blob.vercel-storage.com/media/repeat.jpg',
        path: 'media/test/repeat.jpg',
      }),
    };
    vi.spyOn(storageModule, 'getStorage').mockReturnValue(mockStorage as any);

    // First save
    const firstSave = await saveEphemeralMedia(chatId, replyMsgId, userId, rawReply);
    expect(firstSave.success).toBe(true);
    expect(firstSave.archiveStatus).toBe('ARCHIVED');
    expect(firstSave.message).toContain('✅ Медиафайл успешно зафиксирован');

    // Second save (.save again on the same message)
    const secondSave = await saveEphemeralMedia(chatId, replyMsgId, userId, rawReply);
    expect(secondSave.success).toBe(true);
    expect(secondSave.archiveStatus).toBe('ARCHIVED');
    expect(secondSave.message).toContain('уже успешно сохранён');
    expect(secondSave.media).toBeDefined();
    expect(secondSave.media?.storageUrl).toContain('https://');
  });

  it('should preserve archived media even after original Telegram message is marked deleted', async () => {
    const deletedTgMsgId = 301;
    const mediaUniqueId = `u_del_${Date.now()}`;

    // 1. Message saved
    const msg = await prisma.message.create({
      data: {
        chatId,
        telegramMessageId: deletedTgMsgId,
        telegramDate: new Date(),
        messageType: 'PHOTO',
        isDeleted: false,
      },
    });

    const media = await prisma.messageMedia.create({
      data: {
        messageId: msg.id,
        telegramFileId: 'del_file_id',
        fileUniqueId: mediaUniqueId,
        mediaType: 'photo',
        storageUrl: 'https://store_mock.public.blob.vercel-storage.com/media/deleted_saved.jpg',
        isDownloaded: true,
        archiveStatus: 'ARCHIVED',
      },
    });

    // 2. Original message deleted in Telegram
    await prisma.message.update({
      where: { id: msg.id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    // 3. Verify media is still accessible and resolvable
    const retrievedMedia = await getAuthorizedMediaItem(media.id, userId);
    expect(retrievedMedia).toBeDefined();
    expect(retrievedMedia?.isDownloaded).toBe(true);
    expect(retrievedMedia?.storageUrl).toBe('https://store_mock.public.blob.vercel-storage.com/media/deleted_saved.jpg');
    expect(retrievedMedia?.message.isDeleted).toBe(true);
  });

  it('should sign and validate short-lived media tokens for authorized access', () => {
    const testMediaId = 'med_12345';
    const testUserId = 'usr_abcde';

    const token = generateSignedMediaToken(testMediaId, testUserId, 3600);
    expect(token).toBeDefined();
    expect(token).toContain('.');

    // Valid token validation
    const validatedUser = validateSignedMediaToken(token, testMediaId);
    expect(validatedUser).toBe(testUserId);

    // Mismatched mediaId rejection
    const wrongMedia = validateSignedMediaToken(token, 'med_other_999');
    expect(wrongMedia).toBeNull();

    // Expired token rejection
    const expiredToken = generateSignedMediaToken(testMediaId, testUserId, -10);
    const expiredResult = validateSignedMediaToken(expiredToken, testMediaId);
    expect(expiredResult).toBeNull();

    // Tampered token rejection
    const tampered = `${token.split('.')[0]}.invalid_signature`;
    const tamperedResult = validateSignedMediaToken(tampered, testMediaId);
    expect(tamperedResult).toBeNull();
  });
});
