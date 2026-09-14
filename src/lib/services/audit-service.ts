// ============================================================
// SerkoGram — Audit Service
// ============================================================

import { prisma } from '@/lib/db';
import type { AuditAction, Prisma } from '@prisma/client';

export async function logAudit(
  action: AuditAction,
  userId?: string,
  details?: Record<string, unknown>,
  ipAddress?: string
): Promise<void> {
  try {
    const jsonDetails = details
      ? (JSON.parse(JSON.stringify(details)) as Prisma.InputJsonValue)
      : undefined;

    await prisma.auditLog.create({
      data: {
        action,
        userId,
        details: jsonDetails,
        ipAddress,
      },
    });
  } catch (error) {
    // Audit logging should never break the main flow
    console.error('[Audit] Failed to log audit event:', error);
  }
}
