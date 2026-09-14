import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchMessages } from '@/lib/services/search-service';
import { prisma } from '@/lib/db';

vi.mock('@/lib/db', () => ({
  prisma: {
    message: { findMany: vi.fn() }
  }
}));

describe('Search Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should search with cyrillic text and highlight correctly', async () => {
    const mockMessages = [
      {
        id: 'msg1',
        text: 'Привет, как дела с проектом?',
        caption: null,
        telegramDate: new Date(),
        chat: { id: 'chat1', title: 'Main Chat', telegramChatId: BigInt(123) },
        media: []
      }
    ];

    vi.mocked(prisma.message.findMany).mockResolvedValueOnce(mockMessages as any);

    const result = await searchMessages({ userId: 'user1', query: 'дела' });

    expect(prisma.message.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { text: { contains: 'дела', mode: 'insensitive' } },
            { caption: { contains: 'дела', mode: 'insensitive' } },
            { senderName: { contains: 'дела', mode: 'insensitive' } }
          ]
        })
      })
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0].highlight).toContain('дела');
  });

  it('should support pagination (limit and cursor)', async () => {
    vi.mocked(prisma.message.findMany).mockResolvedValueOnce([
      { id: 'msg1', text: 'test1', chat: {} },
      { id: 'msg2', text: 'test2', chat: {} },
      { id: 'msg3', text: 'test3', chat: {} }
    ] as any);

    const result = await searchMessages({ userId: 'user1', query: 'test', limit: 2, cursor: 'msg0' });

    expect(prisma.message.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 3,
        skip: 1,
        cursor: { id: 'msg0' }
      })
    );

    expect(result.hasMore).toBe(true);
    expect(result.items).toHaveLength(2);
    expect(result.nextCursor).toBe('msg2');
  });

  it('should search with emojis and special characters', async () => {
    const mockMessages = [
      {
        id: 'msg1',
        text: 'Hello 🌍 #world',
        caption: null,
        telegramDate: new Date(),
        chat: { id: 'chat1', title: 'Emoji Chat', telegramChatId: BigInt(123) },
        media: []
      }
    ];

    vi.mocked(prisma.message.findMany).mockResolvedValueOnce(mockMessages as any);

    const result = await searchMessages({ userId: 'user1', query: '🌍' });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].highlight).toContain('🌍');
  });
});
