import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/messages/[id]/route';
import { prisma } from '@/lib/db';
import * as session from '@/lib/auth/session';

vi.mock('@/lib/db', () => ({
  prisma: {
    message: { findFirst: vi.fn() }
  }
}));

vi.mock('@/lib/auth/session', () => ({
  requireAuth: vi.fn()
}));

describe('API IDOR Authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should deny access if message belongs to another user (IDOR prevention)', async () => {
    // Mock user session for User A
    vi.mocked(session.requireAuth).mockResolvedValueOnce({ id: 'user-A' } as any);

    // Mock prisma to return null because findFirst requires connection.userId = user-A
    vi.mocked(prisma.message.findFirst).mockResolvedValueOnce(null);

    const req = new Request('http://localhost/api/messages/msg-123');
    const res = await GET(req, { params: Promise.resolve({ id: 'msg-123' }) });

    expect(res.status).toBe(404);
    
    expect(prisma.message.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'msg-123',
          chat: { connection: { userId: 'user-A' } }
        }
      })
    );
  });

  it('should allow access if message belongs to the user', async () => {
    // Mock user session for User B
    vi.mocked(session.requireAuth).mockResolvedValueOnce({ id: 'user-B' } as any);

    // Mock prisma to return the message
    vi.mocked(prisma.message.findFirst).mockResolvedValueOnce({
      id: 'msg-123',
      text: 'Secret text',
      telegramDate: new Date(),
      telegramMessageId: BigInt(123456)
    } as any);

    const req = new Request('http://localhost/api/messages/msg-123');
    const res = await GET(req, { params: Promise.resolve({ id: 'msg-123' }) });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data.message.id).toBe('msg-123');
    // Ensure BigInt is serialized properly
    expect(data.data.message.telegramMessageId).toBe('123456');
  });
});
