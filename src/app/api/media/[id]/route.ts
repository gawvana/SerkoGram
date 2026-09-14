import { requireAuth } from '@/lib/auth/session';
import { apiError, apiSuccess } from '@/lib/api-helpers';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const resolvedParams = await params;

    // Strict ownership verification: user -> connection -> chat -> message -> media
    const media = await prisma.messageMedia.findFirst({
      where: {
        id: resolvedParams.id,
        message: {
          chat: {
            connection: { userId: user.id },
          },
        },
      },
    });

    if (!media) {
      return apiError('Медиафайл не найден или доступ ограничен', 404);
    }

    if (!media.isDownloaded || !media.storageUrl) {
      return apiError('Медиафайл не был загружен в архив или ожидает обработки', 422);
    }

    const { searchParams } = new URL(req.url);
    if (searchParams.get('json') === 'true') {
      return apiSuccess({
        id: media.id,
        fileName: media.fileName,
        mimeType: media.mimeType,
        fileSize: media.fileSize,
        mediaType: media.mediaType,
      });
    }

    // Secure reverse-proxy stream: raw storage URL is never exposed to client
    const response = await fetch(media.storageUrl);
    if (!response.ok) {
      return apiError('Ошибка получения медиафайла из хранилища', 502);
    }

    return new Response(response.body, {
      status: 200,
      headers: {
        'Content-Type': media.mimeType || 'application/octet-stream',
        'Cache-Control': 'private, no-transform, max-age=3600',
        'Content-Disposition': `inline; filename="${encodeURIComponent(media.fileName || 'media')}"`,
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error: any) {
    return apiError(error.message || 'Ошибка сервера', error.status || 500);
  }
}