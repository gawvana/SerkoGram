import { verifyWebhookSecret } from '@/lib/telegram/bot';
import { processUpdate } from '@/lib/telegram/webhook';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    if (!verifyWebhookSecret(req)) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const update = await req.json();

    // Reliably process update: on temporary failure, returns 500 so Telegram retries
    await processUpdate(update);

    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    console.error('[Webhook] Update processing failed, returning 500 for retry:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}