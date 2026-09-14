import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { checkRateLimit, rateLimitResponse } from '@/lib/auth/rate-limit';

describe('Rate Limiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should allow requests within limit', () => {
    const identifier = 'user-1';
    for (let i = 0; i < 120; i++) {
      const result = checkRateLimit(identifier);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(120 - i - 1);
    }
  });

  it('should block requests over limit', () => {
    const identifier = 'user-2';
    for (let i = 0; i < 120; i++) {
      checkRateLimit(identifier);
    }
    const result = checkRateLimit(identifier);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('should reset limit after window time', () => {
    const identifier = 'user-3';
    for (let i = 0; i < 120; i++) {
      checkRateLimit(identifier);
    }
    expect(checkRateLimit(identifier).allowed).toBe(false);

    vi.advanceTimersByTime(60000 + 100);

    const result = checkRateLimit(identifier);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(119);
  });

  it('should return Response object if limited', () => {
    const identifier = 'user-4';
    for (let i = 0; i < 120; i++) {
      rateLimitResponse(identifier);
    }
    const res = rateLimitResponse(identifier);
    expect(res).toBeInstanceOf(Response);
    expect(res?.status).toBe(429);
  });
});
