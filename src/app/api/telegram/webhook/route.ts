import { verifyWebhookSecret } from '@/lib/telegram/bot';
import { processUpdate } from '@/lib/telegram/webhook';
import { NextResponse } from 'next/server';
import { after } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    if (!verifyWebhookSecret(req)) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const update = await req.json();

    after(async () => {
      try {
        await processUpdate(update);
      } catch (err) {
        console.error('Webhook processing error:', err);
      }
    });

    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    console.error('Webhook POST error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
