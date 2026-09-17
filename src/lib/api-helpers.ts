// ============================================================
// SerkoGram — API Response Helpers
// ============================================================

import { NextResponse } from 'next/server';
import type { ApiResponse } from '@/lib/types';

export function apiSuccess<T>(data: T, status = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data }, { status });
}

export function apiError(error: string, status = 400): NextResponse<ApiResponse> {
  const finalStatus = (error === 'Unauthorized' && status === 500)
    ? 401
    : (error === 'Forbidden' && status === 500)
    ? 403
    : status;
  return NextResponse.json({ success: false, error }, { status: finalStatus });
}

export function apiUnauthorized(): NextResponse<ApiResponse> {
  return apiError('Требуется авторизация', 401);
}

export function apiForbidden(): NextResponse<ApiResponse> {
  return apiError('Доступ запрещён', 403);
}

export function apiNotFound(entity = 'Ресурс'): NextResponse<ApiResponse> {
  return apiError(`${entity} не найден`, 404);
}

export function apiServerError(message = 'Внутренняя ошибка сервера'): NextResponse<ApiResponse> {
  return apiError(message, 500);
}

/**
 * Safely parse JSON body from request
 */
export async function parseBody<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Get pagination params from URL search params
 */
export function getPaginationParams(url: URL): { cursor?: string; limit: number } {
  const cursor = url.searchParams.get('cursor') ?? undefined;
  const limitStr = url.searchParams.get('limit');
  let limit = 30;

  if (limitStr) {
    const parsed = parseInt(limitStr, 10);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 100) {
      limit = parsed;
    }
  }

  return { cursor, limit };
}
