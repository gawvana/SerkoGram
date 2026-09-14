import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  detectEphemeralAttributes,
  saveEphemeralMedia,
} from '@/lib/services/ephemeral-service';

// Mock Prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    message: {
      findUnique: vi.fn(),
    },
    messageMedia: {
      update: vi.fn(),
    },
  },
}));

// Mock Media Service
vi.mock('@/lib/services/media-service', () => ({
  downloadAndStoreMedia: vi.fn().mockResolvedValue(undefined),
}));

describe('Ephemeral Media Detection (detectEphemeralAttributes)', () => {
  it('should detect standard permanent media', () => {
    const normalMsg = {
      message_id: 1,
      photo: [{ file_id: 'ph_1' }],
    };
    const res = detectEphemeralAttributes(normalMsg);
    expect(res.isEphemeral).toBe(false);
    expect(res.isViewOnce).toBe(false);
    expect(res.ttlSeconds).toBeUndefined();
  });

  it('should detect ephemeral media with ttl_seconds', () => {
    const ttlMsg = {
      message_id: 2,
      ttl_seconds: 30,
    };
    const res = detectEphemeralAttributes(ttlMsg);
    expect(res.isEphemeral).toBe(true);
    expect(res.isViewOnce).toBe(true);
    expect(res.ttlSeconds).toBe(30);
  });

  it('should detect view_once flag from MTProto/Bot API', () => {
    const viewOnceMsg = {
      message_id: 3,
      is_view_once: true,
    };
    const res = detectEphemeralAttributes(viewOnceMsg);
    expect(res.isEphemeral).toBe(true);
    expect(res.isViewOnce).toBe(true);
  });

  it('should detect photo_ttl or video_ttl', () => {
    const photoTtlMsg = {
      message_id: 4,
      photo_ttl: 10,
    };
    const res = detectEphemeralAttributes(photoTtlMsg);
    expect(res.isEphemeral).toBe(true);
    expect(res.isViewOnce).toBe(true);
    expect(res.ttlSeconds).toBe(10);
  });

  it('should handle null/undefined safely', () => {
    expect(detectEphemeralAttributes(null)).toEqual({
      isEphemeral: false,
      isViewOnce: false,
    });
    expect(detectEphemeralAttributes(undefined)).toEqual({
      isEphemeral: false,
      isViewOnce: false,
    });
  });
});

import { prisma } from '@/lib/db';

describe('Ephemeral Save Flow (saveEphemeralMedia)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return UNAVAILABLE if replied message is not in archive', async () => {
    (prisma.message.findUnique as any).mockResolvedValue(null);

    const res = await saveEphemeralMedia('chat_1', 123, 'user_1');
    expect(res.success).toBe(false);
    expect(res.archiveStatus).toBe('UNAVAILABLE');
    expect(res.message).toContain('не найдено');
  });

  it('should return UNAVAILABLE if chat belongs to another user (IDOR prevention)', async () => {
    (prisma.message.findUnique as any).mockResolvedValue({
      id: 'msg_1',
      chat: {
        connection: { userId: 'user_OTHER' },
      },
      media: [{ id: 'med_1' }],
    });

    const res = await saveEphemeralMedia('chat_1', 123, 'user_ME');
    expect(res.success).toBe(false);
    expect(res.archiveStatus).toBe('UNAVAILABLE');
    expect(res.message).toContain('Доступ ограничен');
  });

  it('should return UNAVAILABLE if message has no media', async () => {
    (prisma.message.findUnique as any).mockResolvedValue({
      id: 'msg_1',
      chat: {
        connection: { userId: 'user_1' },
      },
      media: [],
    });

    const res = await saveEphemeralMedia('chat_1', 123, 'user_1');
    expect(res.success).toBe(false);
    expect(res.archiveStatus).toBe('UNAVAILABLE');
    expect(res.message).toContain('не обнаружено медиафайлов');
  });

  it('should return ARCHIVED immediately if media is already downloaded and saved', async () => {
    (prisma.message.findUnique as any).mockResolvedValue({
      id: 'msg_1',
      chat: {
        connection: { userId: 'user_1' },
      },
      media: [
        {
          id: 'med_1',
          isDownloaded: true,
          storageUrl: 'https://blob.vercel-storage.com/media.jpg',
        },
      ],
    });

    const res = await saveEphemeralMedia('chat_1', 123, 'user_1');
    expect(res.success).toBe(true);
    expect(res.archiveStatus).toBe('ARCHIVED');
    expect(res.message).toContain('уже успешно сохранён');
  });
});
