import { prisma } from '@/lib/db';
import { apiSuccess } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

export async function GET() {
  let dbStatus = 'unconfigured';

  if (process.env.DATABASE_URL) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
    } catch {
      dbStatus = 'disconnected';
    }
  }

  return apiSuccess({
    status: 'healthy',
    database: dbStatus,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    service: 'SerkoGram',
  });
}
