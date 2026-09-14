import { prisma } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return apiSuccess({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
  } catch (error) {
    return apiError('Database connection failed', 500);
  }
}
