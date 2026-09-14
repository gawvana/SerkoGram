import { describe, it, expect, vi, beforeEach } from 'vitest';
import { saveMessage, processEditedMessage, processDeletedMessages } from '@/lib/services/message-service';
import { prisma } from '@/lib/db';

vi.mock('@/lib/db', () => ({
  prisma: {
    message: { upsert: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    chat: { update: vi.fn() },
    messageVersion: { create: vi.fn() },
    messageDeletion: { upsert: vi.fn() },
    $transaction: vi.fn(async (ops) => Promise.all(ops))
  }
}));

describe('Message Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('saveMessage', () => {
    it('should upsert message and update chat stats', async () => {
      const input = {
        chatId: 'chat1',
        telegramMessageId: 100,
        isOutgoing: false,
        messageType: 'TEXT' as const,
        text: 'Hello world',
        telegramDate: new Date()
      };

      vi.mocked(prisma.message.upsert).mockResolvedValueOnce({ id: 'msg1', ...input } as any);
      vi.mocked(prisma.chat.update).mockResolvedValueOnce({} as any);

      const result = await saveMessage(input);

      expect(prisma.message.upsert).toHaveBeenCalled();
      expect(prisma.chat.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'chat1' },
          data: expect.objectContaining({
            totalMessages: { increment: 1 },
            lastMessagePreview: 'Hello world'
          })
        })
      );
      expect(result.id).toBe('msg1');
    });
  });

  describe('processEditedMessage', () => {
    it('should create version and update message', async () => {
      const existingMsg = {
        id: 'msg1',
        text: 'Old text',
        versions: []
      };

      vi.mocked(prisma.message.findUnique).mockResolvedValueOnce(existingMsg as any);
      vi.mocked(prisma.messageVersion.create).mockResolvedValueOnce({} as any);
      vi.mocked(prisma.message.update).mockResolvedValueOnce({ id: 'msg1', text: 'New text' } as any);

      await processEditedMessage({
        chatId: 'chat1',
        telegramMessageId: 100,
        newText: 'New text',
        editedAt: new Date()
      });

      expect(prisma.messageVersion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            messageId: 'msg1',
            text: 'Old text',
            version: 1
          })
        })
      );

      expect(prisma.message.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'msg1' },
          data: expect.objectContaining({ text: 'New text', isEdited: true })
        })
      );
    });
  });

  describe('processDeletedMessages', () => {
    it('should mark messages as deleted in a transaction', async () => {
      vi.mocked(prisma.message.findUnique).mockResolvedValueOnce({ id: 'msg1' } as any)
                                          .mockResolvedValueOnce({ id: 'msg2' } as any);

      const count = await processDeletedMessages('chat1', [100, 101], new Date());

      expect(count).toBe(2);
      expect(prisma.$transaction).toHaveBeenCalledTimes(2);
      expect(prisma.chat.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { deletedMessages: { increment: 2 } }
        })
      );
    });
  });
});
