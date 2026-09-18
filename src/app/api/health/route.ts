import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';
import { checkBotBusinessCapability } from '@/lib/telegram/bot';
import { getStorage } from '@/lib/services/storage-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  let dbStatus = 'unconfigured';
  let dbOk = false;

  if (process.env.DATABASE_URL) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
      dbOk = true;
    } catch {
      dbStatus = 'disconnected';
      dbOk = false;
    }
  } else {
    // In dev / test / mock mode without DATABASE_URL
    dbStatus = 'unconfigured';
    dbOk = process.env.NODE_ENV !== 'production';
  }

  // 1. If PostgreSQL fails when configured, return HTTP 503 (§17)
  if (process.env.DATABASE_URL && !dbOk) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        database: 'disconnected',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }

  // 2. Storage status
  const storage = getStorage();
  const storageStatus = storage.isConfigured() ? 'configured' : 'unconfigured';

  // 3. Bot preflight capability
  let botCapability: { can_connect_to_business: boolean; username: string } = {
    can_connect_to_business: false,
    username: '',
  };

  try {
    if (process.env.TELEGRAM_BOT_TOKEN) {
      const cap = await checkBotBusinessCapability();
      botCapability = {
        can_connect_to_business: cap.canConnectToBusiness,
        username: cap.username,
      };
    }
  } catch {
    // Non-fatal for health
  }

  return NextResponse.json({
    status: 'healthy',
    database: dbStatus,
    storage: storageStatus,
    bot: botCapability,
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    service: 'SerkoGram',
  });
}
