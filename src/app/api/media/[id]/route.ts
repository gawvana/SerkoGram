import { getAuthenticatedUser } from '@/lib/auth/session';
import { apiError, apiSuccess } from '@/lib/api-helpers';
import { prisma } from '@/lib/db';
import { validateSignedMediaToken } from '@/lib/services/media-service';
import { getStorage } from '@/lib/services/storage-service';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const mediaId = resolvedParams.id;
    const { searchParams } = new URL(req.url);

    // 1. Authenticate via session cookie, initData header, or signed media token (§11, §21)
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

    // 2. Strict ownership verification:
    // First, check canonical MediaAttachment table
    let resolvedStorageUrl: string | null = null;
    let fileName: string | null = null;
    let mimeType: string | null = null;
    let fileSize: number | null = null;
    let mediaType: string = 'media';

    const mediaAttachment = await prisma.mediaAttachment.findFirst({
      where: {
        id: mediaId,
        archiveMessage: {
          connection: { userId },
        },
      },
      include: {
        archiveMessage: true,
      },
    });

    if (mediaAttachment && mediaAttachment.status === 'SAVED') {
      fileName = mediaAttachment.fileName;
      mimeType = mediaAttachment.mimeType;
      fileSize = mediaAttachment.fileSize;
      mediaType = mediaAttachment.mediaType;

      // Resolve real storage object: if storageKey is present, query Vercel Blob
      if (mediaAttachment.storageKey) {
        const storage = getStorage();
        const info = await storage.getInfo(mediaAttachment.storageKey).catch(() => null);
        resolvedStorageUrl = info?.url || mediaAttachment.storageUrl;
      } else {
        resolvedStorageUrl = mediaAttachment.storageUrl;
      }
    } else {
      // Check legacy MessageMedia table for backwards compatibility
      const legacyMedia = await prisma.messageMedia.findFirst({
        where: {
          id: mediaId,
          message: {
            chat: {
              connection: { userId },
            },
          },
        },
      });

      if (legacyMedia && legacyMedia.isDownloaded && legacyMedia.storageUrl) {
        fileName = legacyMedia.fileName;
        mimeType = legacyMedia.mimeType;
        fileSize = legacyMedia.fileSize;
        mediaType = legacyMedia.mediaType;
        resolvedStorageUrl = legacyMedia.storageUrl;
      }
    }

    if (!resolvedStorageUrl) {
      // Return 404 (don't leak existence for unauthorized or missing media)
      return apiError('Медиафайл не найден или доступ ограничен', 404);
    }

    // 3. Metadata JSON mode
    if (searchParams.get('json') === 'true') {
      return apiSuccess({
        id: mediaId,
        fileName,
        mimeType,
        fileSize,
        mediaType,
        status: 'SAVED',
      });
    }

    // 4. Secure reverse-proxy stream: raw storage URL is never exposed to client
    const response = await fetch(resolvedStorageUrl);
    if (!response.ok) {
      console.error(`[MediaProxy] Storage fetch failed for media ${mediaId}: HTTP ${response.status}`);
      return apiError('Ошибка получения медиафайла из хранилища', 502);
    }

    const headers = new Headers();
    headers.set('Content-Type', mimeType || response.headers.get('content-type') || 'application/octet-stream');
    headers.set('Cache-Control', 'private, no-transform, max-age=3600');
    headers.set('Content-Disposition', `inline; filename="${encodeURIComponent(fileName || `media_${mediaId}`)}"`);
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('Accept-Ranges', 'bytes');

    const contentLength = response.headers.get('content-length') || (fileSize ? String(fileSize) : null);
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