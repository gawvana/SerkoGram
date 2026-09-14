// ============================================================
// SerkoGram — Rate Limiter
// In-memory sliding window rate limiter for API routes
// ============================================================

const windowMs = 60 * 1000; // 1 minute
const maxRequests = 120;

interface RateEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateEntry>();

// Cleanup old entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.resetAt < now) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

/**
 * Check if a request from the given identifier is rate-limited.
 * Returns true if the request is allowed, false if rate-limited.
 */
export function checkRateLimit(identifier: string): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} {
  const now = Date.now();
  const entry = store.get(identifier);

  if (!entry || entry.resetAt < now) {
    store.set(identifier, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs };
  }

  entry.count++;

  if (entry.count > maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return { allowed: true, remaining: maxRequests - entry.count, resetAt: entry.resetAt };
}

/**
 * Rate limit middleware helper for API routes.
 * Returns a Response if rate-limited, null if allowed.
 */
export function rateLimitResponse(identifier: string): Response | null {
  const { allowed, remaining, resetAt } = checkRateLimit(identifier);

  if (!allowed) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Слишком много запросов. Попробуйте позже.',
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
          'Retry-After': String(Math.ceil((resetAt - Date.now()) / 1000)),
        },
      }
    );
  }

  return null;
}
