import { getAuthenticatedUser } from '@/lib/auth/session';
import { apiError, apiSuccess } from '@/lib/api-helpers';
import { prisma } from '@/lib/db';
import { validateSignedMediaToken } from '@/lib/services/media-service';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const mediaId = resolvedParams.id;
    const { searchParams } = new URL(req.url);

    // 1. Authenticate via session cookie, initData header, or signed media token
    let userId: string | null = null;

    const user = await getAuthenticatedUser();
    if (user) {
      userId = user.id;
    } else {
      const signedToken = searchParams.get('token');
      if (signedToken) {
        userId = validateSignedMediaToken(signedToken, mediaId);
      }
    }

    if (!userId) {
      return apiError('Unauthorized', 401);
    }

    // 2. Strict ownership verification: user -> connection -> chat -> message -> media
    const media = await prisma.messageMedia.findFirst({
      where: {
        id: mediaId,
        message: {
          chat: {
            connection: { userId },
          },
        },
      },
      include: {
        message: {
          select: {
            id: true,
            chatId: true,
            telegramMessageId: true,
            telegramDate: true,
            text: true,
            caption: true,
            senderName: true,
            isDeleted: true,
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

    // 3. Metadata JSON mode
    if (searchParams.get('json') === 'true') {
      return apiSuccess({
        id: media.id,
        fileName: media.fileName,
        mimeType: media.mimeType,
        fileSize: media.fileSize,
        mediaType: media.mediaType,
        width: media.width,
        height: media.height,
        duration: media.duration,
        isEphemeral: media.isEphemeral,
        isViewOnce: media.isViewOnce,
        archiveStatus: media.archiveStatus,
        createdAt: media.createdAt,
        message: media.message,
      });
    }

    // 4. Secure reverse-proxy stream: raw storage URL is never exposed to client
    const response = await fetch(media.storageUrl);
    if (!response.ok) {
      console.error(`[MediaProxy] Storage fetch failed for media ${media.id}: HTTP ${response.status}`);
      return apiError('Ошибка получения медиафайла из хранилища', 502);
    }

    const headers = new Headers();
    headers.set('Content-Type', media.mimeType || response.headers.get('content-type') || 'application/octet-stream');
    headers.set('Cache-Control', 'private, no-transform, max-age=3600');
    headers.set('Content-Disposition', `inline; filename="${encodeURIComponent(media.fileName || `media_${media.id}`)}"`);
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('Accept-Ranges', 'bytes');

    const contentLength = response.headers.get('content-length') || (media.fileSize ? String(media.fileSize) : null);
    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }

    return new Response(response.body, {
      status: 200,
      headers,
    });
  } catch (error: any) {
    console.error('[MediaProxy] Handler error:', error);
    return apiError(error.message || 'Ошибка сервера', error.status || 500);
  }
}