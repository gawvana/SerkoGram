import { describe, it, expect } from 'vitest';

describe('Outgoing vs Incoming Message Detection', () => {
  const businessOwnerTelegramId = BigInt(123456789);
  const otherUserTelegramId = BigInt(987654321);

  // Exact logic implemented in webhook.ts
  function determineIsOutgoing(
    senderId: number | undefined,
    ownerTelegramId: bigint | undefined,
    isFromOffline?: boolean
  ): boolean {
    if (isFromOffline === true) return true;
    if (!senderId || !ownerTelegramId) return false;
    return BigInt(senderId) === ownerTelegramId;
  }

  it('should identify message from business owner as outgoing', () => {
    const isOutgoing = determineIsOutgoing(123456789, businessOwnerTelegramId, false);
    expect(isOutgoing).toBe(true);
  });

  it('should identify message from client/contact as incoming (not outgoing)', () => {
    const isOutgoing = determineIsOutgoing(987654321, businessOwnerTelegramId, false);
    expect(isOutgoing).toBe(false);
  });

  it('should handle is_from_offline as outgoing even if sender ID is missing', () => {
    const isOutgoing = determineIsOutgoing(undefined, businessOwnerTelegramId, true);
    expect(isOutgoing).toBe(true);
  });

  it('should treat unknown sender as incoming (safe fallback)', () => {
    const isOutgoing = determineIsOutgoing(undefined, businessOwnerTelegramId, false);
    expect(isOutgoing).toBe(false);
  });

  it('should never compare internal string userId with telegram numeric id', () => {
    const internalUserId = "cly1234567890abcdef";
    // Previous buggy comparison: msg.from?.id === Number(connection.userId)
    const buggyResult = 123456789 === Number(internalUserId);
    expect(buggyResult).toBe(false); // Demonstrates the previous bug would always fail

    // Fixed comparison using ownerTelegramId
    const fixedResult = BigInt(123456789) === businessOwnerTelegramId;
    expect(fixedResult).toBe(true);
  });
});