// ============================================================
// SerkoGram — Session Management
// Signed cookie-based sessions for Mini App auth
// ============================================================

import crypto from 'crypto';
import { cookies, headers } from 'next/headers';
import { prisma } from '@/lib/db';
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE } from '@/lib/constants';
import { validateInitData } from '@/lib/auth/telegram';
import type { SessionPayload } from '@/lib/types';
import type { User } from '@prisma/client';

const SESSION_SECRET = () => {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET must be at least 32 characters');
  }
  return secret;
};

/**
 * Sign a payload into a session token
 */
function signToken(payload: SessionPayload): string {
  const data = JSON.stringify(payload);
  const encoded = Buffer.from(data).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET())
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${signature}`;
}

/**
 * Verify and decode a session token
 */
function verifyToken(token: string): SessionPayload | null {
  try {
    const [encoded, signature] = token.split('.');
    if (!encoded || !signature) return null;

    const expectedSignature = crypto
      .createHmac('sha256', SESSION_SECRET())
      .update(encoded)
      .digest('base64url');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null;
    }

    const data = JSON.parse(Buffer.from(encoded, 'base64url').toString());
    const payload = data as SessionPayload;

    // Check expiration
    if (payload.expiresAt < Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Create a new session for a user
 */
export async function createSession(user: User): Promise<string> {
  const payload: SessionPayload = {
    userId: user.id,
    telegramId: Number(user.telegramId),
    isAdmin: user.isAdmin,
    expiresAt: Date.now() + SESSION_MAX_AGE * 1000,
  };

  const token = signToken(payload);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });

  return token;
}

/**
 * Get the authenticated user from the session cookie or x-telegram-init-data header.
 * Returns null if no valid session exists.
 */
export async function getAuthenticatedUser(): Promise<User | null> {
  // 1. Check session cookie first
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

    if (sessionCookie?.value) {
      const payload = verifyToken(sessionCookie.value);
      if (payload) {
        const user = await prisma.user.findUnique({
          where: { id: payload.userId },
        });
        if (user) return user;
      }
    }
  } catch {
    // Cookie store might be unavailable outside request context
  }

  // 2. Check x-telegram-init-data header fallback (critical for Mini App WebViews)
  try {
    const headerStore = await headers();
    const initDataHeader = headerStore.get('x-telegram-init-data');

    if (initDataHeader) {
      const initData = validateInitData(initDataHeader);
      if (initData?.user) {
        const tgUser = initData.user;
        const adminTelegramId = process.env.ADMIN_TELEGRAM_ID;
        const isAdmin = Boolean(adminTelegramId && String(tgUser.id) === adminTelegramId.trim());

        const user = await prisma.user.upsert({
          where: { telegramId: BigInt(tgUser.id) },
          update: {
            firstName: tgUser.first_name,
            lastName: tgUser.last_name || null,
            username: tgUser.username || null,
            languageCode: tgUser.language_code || 'ru',
            photoUrl: tgUser.photo_url || null,
            isPremium: tgUser.is_premium || false,
            isAdmin: isAdmin,
            lastLoginAt: new Date(),
          },
          create: {
            telegramId: BigInt(tgUser.id),
            firstName: tgUser.first_name,
            lastName: tgUser.last_name || null,
            username: tgUser.username || null,
            languageCode: tgUser.language_code || 'ru',
            photoUrl: tgUser.photo_url || null,
            isPremium: tgUser.is_premium || false,
            isAdmin: isAdmin,
            settings: { create: {} },
            privacySettings: { create: {} },
          },
        });
        return user;
      }
    }
  } catch {
    // Headers store might be unavailable outside request context
  }

  return null;
}

export class UnauthorizedError extends Error {
  status = 401;
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  status = 403;
  constructor(message = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

/**
 * Require authentication — throws if not authenticated
 */
export async function requireAuth(): Promise<User> {
  const user = await getAuthenticatedUser();
  if (!user) {
    throw new UnauthorizedError('Unauthorized');
  }
  return user;
}

/**
 * Require admin authentication
 */
export async function requireAdmin(): Promise<User> {
  const user = await requireAuth();
  if (!user.isAdmin) {
    throw new ForbiddenError('Forbidden');
  }
  return user;
}

/**
 * Destroy the current session
 */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
