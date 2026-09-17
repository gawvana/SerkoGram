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

    let update: any;
    try {
      update = await req.json();
    } catch {
      return new NextResponse('Bad Request: Invalid JSON', { status: 400 });
    }

    try {
      await processUpdate(update);
      return new NextResponse('OK', { status: 200 });
    } catch (procError) {
      console.error('[Webhook] Update processing failed (server error):', procError);
      return new NextResponse('Internal Server Error', { status: 500 });
    }
  } catch (error) {
    console.error('[Webhook] Request error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}