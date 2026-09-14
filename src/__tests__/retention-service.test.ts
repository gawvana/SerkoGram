import { describe, it, expect, vi, beforeEach } from 'vitest';
import { enforceRetention, deleteUserArchive, deleteUserAccount } from '@/lib/services/retention-service';
import { prisma } from '@/lib/db';

vi.mock('@/lib/db', () => ({
  prisma: {
    privacySettings: { findUnique: vi.fn() },
    businessConnection: { findMany: vi.fn() },
    message: { deleteMany: vi.fn() },
    chat: { updateMany: vi.fn() },
    user: { delete: vi.fn() }
  }
}));

describe('Retention Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('enforceRetention', () => {
    it('should not delete anything if setting is FOREVER', async () => {
      vi.mocked(prisma.privacySettings.findUnique).mockResolvedValueOnce({
        userId: 'user1',
        retention: 'FOREVER',
        searchEngineEnabled: true
      } as any);

      const count = await enforceRetention('user1');
      expect(count).toBe(0);
      expect(prisma.message.deleteMany).not.toHaveBeenCalled();
    });

    it('should delete messages older than retention period', async () => {
      vi.mocked(prisma.privacySettings.findUnique).mockResolvedValueOnce({
        userId: 'user1',
        retention: 'DAYS_30',
        searchEngineEnabled: true
      } as any);

      vi.mocked(prisma.businessConnection.findMany).mockResolvedValueOnce([
        { id: 'conn1' }
      ] as any);

      vi.mocked(prisma.message.deleteMany).mockResolvedValueOnce({ count: 5 } as any);

      const count = await enforceRetention('user1');
      expect(count).toBe(5);
      expect(prisma.message.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            chat: { connectionId: { in: ['conn1'] } },
            createdAt: { lt: expect.any(Date) }
          })
        })
      );
    });
  });

  describe('deleteUserArchive', () => {
    it('should cascade delete user archive and reset counters', async () => {
      vi.mocked(prisma.businessConnection.findMany).mockResolvedValueOnce([
        { id: 'conn1' }
      ] as any);

      await deleteUserArchive('user1');

      expect(prisma.message.deleteMany).toHaveBeenCalledWith({
        where: { chat: { connectionId: { in: ['conn1'] } } }
      });
      expect(prisma.chat.updateMany).toHaveBeenCalledWith({
        where: { connectionId: { in: ['conn1'] } },
        data: expect.objectContaining({ totalMessages: 0 })
      });
    });
  });
});
