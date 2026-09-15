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

    // Reliably process update without returning 500 retry storms
    try {
      await processUpdate(update);
    } catch (procError) {
      console.error('[Webhook] Update processing failed (handled safely):', procError);
    }

    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    console.error('[Webhook] Request parsing error:', error);
    return new NextResponse('OK', { status: 200 });
  }
}