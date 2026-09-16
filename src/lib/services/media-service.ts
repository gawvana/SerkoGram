// ============================================================
// SerkoGram — Media Service
// Downloads media from Telegram and stores in blob storage
// ============================================================

import { prisma } from '@/lib/db';
import { getBot } from '@/lib/telegram/bot';
import { getStorage } from './storage-service';

import { detectEphemeralAttributes } from './ephemeral-service';
import type { ArchiveStatus } from '@prisma/client';

export type MediaSaveStatus =
  | 'SAVED'
  | 'ALREADY_SAVED'
  | 'TELEGRAM_FILE_ERROR'
  | 'DOWNLOAD_ERROR'
  | 'STORAGE_ERROR'
  | 'DB_ERROR'
  | 'UNAVAILABLE';

export interface MediaSaveResult {
  success: boolean;
  status: MediaSaveStatus;
  mediaId?: string;
  storageUrl?: string;
  storagePath?: string;
  errorCode?: string;
  error?: string;
}

export interface ExtractedTelegramMedia {
  mediaType: 'PHOTO' | 'VIDEO' | 'VOICE' | 'VIDEO_NOTE' | 'AUDIO' | 'DOCUMENT' | 'ANIMATION' | 'STICKER';
  fileId: string;
  fileUniqueId: string;
  mimeType?: string;
  fileName?: string;
  fileSize?: number;
  width?: number;
  height?: number;
  duration?: number;
  thumbnail?: {
    fileId: string;
    fileUniqueId: string;
    fileSize?: number;
    width?: number;
    height?: number;
  };
  isEphemeral?: boolean;
  isViewOnce?: boolean;
  ttlSeconds?: number;
}

/**
 * Canonical extraction of media metadata from any Telegram message object.
 */
export function extractTelegramMedia(msg: any): ExtractedTelegramMedia | null {
  if (!msg || typeof msg !== 'object') return null;

  const eph = detectEphemeralAttributes(msg);
  const ephMeta = {
    isEphemeral: eph.isEphemeral,
    isViewOnce: eph.isViewOnce,
    ttlSeconds: eph.ttlSeconds,
  };

  // 1. Photo (pick largest resolution)
  if (Array.isArray(msg.photo) && msg.photo.length > 0) {
    const largest = msg.photo[msg.photo.length - 1];
    return {
      mediaType: 'PHOTO',
      fileId: largest.file_id,
      fileUniqueId: largest.file_unique_id,
      mimeType: 'image/jpeg',
      fileSize: largest.file_size,
      width: largest.width,
      height: largest.height,
      ...ephMeta,
    };
  }

  // 2. Video
  if (msg.video) {
    return {
      mediaType: 'VIDEO',
      fileId: msg.video.file_id,
      fileUniqueId: msg.video.file_unique_id,
      mimeType: msg.video.mime_type || 'video/mp4',
      fileName: msg.video.file_name,
      fileSize: msg.video.file_size,
      width: msg.video.width,
      height: msg.video.height,
      duration: msg.video.duration,
      thumbnail: msg.video.thumbnail
        ? {
            fileId: msg.video.thumbnail.file_id,
            fileUniqueId: msg.video.thumbnail.file_unique_id,
            fileSize: msg.video.thumbnail.file_size,
            width: msg.video.thumbnail.width,
            height: msg.video.thumbnail.height,
          }
        : undefined,
      ...ephMeta,
    };
  }

  // 3. Voice
  if (msg.voice) {
    return {
      mediaType: 'VOICE',
      fileId: msg.voice.file_id,
      fileUniqueId: msg.voice.file_unique_id,
      mimeType: msg.voice.mime_type || 'audio/ogg',
      fileSize: msg.voice.file_size,
      duration: msg.voice.duration,
      ...ephMeta,
    };
  }

  // 4. Video note (round video)
  if (msg.video_note) {
    return {
      mediaType: 'VIDEO_NOTE',
      fileId: msg.video_note.file_id,
      fileUniqueId: msg.video_note.file_unique_id,
      mimeType: 'video/mp4',
      fileSize: msg.video_note.file_size,
      duration: msg.video_note.duration,
      width: msg.video_note.length,
      height: msg.video_note.length,
      thumbnail: msg.video_note.thumbnail
        ? {
            fileId: msg.video_note.thumbnail.file_id,
            fileUniqueId: msg.video_note.thumbnail.file_unique_id,
            fileSize: msg.video_note.thumbnail.file_size,
            width: msg.video_note.thumbnail.width,
            height: msg.video_note.thumbnail.height,
          }
        : undefined,
      ...ephMeta,
    };
  }

  // 5. Audio
  if (msg.audio) {
    return {
      mediaType: 'AUDIO',
      fileId: msg.audio.file_id,
      fileUniqueId: msg.audio.file_unique_id,
      mimeType: msg.audio.mime_type || 'audio/mpeg',
      fileName: msg.audio.file_name,
      fileSize: msg.audio.file_size,
      duration: msg.audio.duration,
      thumbnail: msg.audio.thumbnail
        ? {
            fileId: msg.audio.thumbnail.file_id,
            fileUniqueId: msg.audio.thumbnail.file_unique_id,
            fileSize: msg.audio.thumbnail.file_size,
            width: msg.audio.thumbnail.width,
            height: msg.audio.thumbnail.height,
          }
        : undefined,
      ...ephMeta,
    };
  }

  // 6. Animation (GIF)
  if (msg.animation) {
    return {
      mediaType: 'ANIMATION',
      fileId: msg.animation.file_id,
      fileUniqueId: msg.animation.file_unique_id,
      mimeType: msg.animation.mime_type || 'video/mp4',
      fileName: msg.animation.file_name,
      fileSize: msg.animation.file_size,
      width: msg.animation.width,
      height: msg.animation.height,
      duration: msg.animation.duration,
      ...ephMeta,
    };
  }

  // 7. Sticker
  if (msg.sticker) {
    return {
      mediaType: 'STICKER',
      fileId: msg.sticker.file_id,
      fileUniqueId: msg.sticker.file_unique_id,
      mimeType: msg.sticker.is_animated
        ? 'application/x-tgsticker'
        : msg.sticker.is_video
        ? 'video/webm'
        : 'image/webp',
      fileSize: msg.sticker.file_size,
      width: msg.sticker.width,
      height: msg.sticker.height,
      ...ephMeta,
    };
  }

  // 8. Document
  if (msg.document) {
    return {
      mediaType: 'DOCUMENT',
      fileId: msg.document.file_id,
      fileUniqueId: msg.document.file_unique_id,
      mimeType: msg.document.mime_type || 'application/octet-stream',
      fileName: msg.document.file_name,
      fileSize: msg.document.file_size,
      thumbnail: msg.document.thumbnail
        ? {
            fileId: msg.document.thumbnail.file_id,
            fileUniqueId: msg.document.thumbnail.file_unique_id,
            fileSize: msg.document.thumbnail.file_size,
            width: msg.document.thumbnail.width,
            height: msg.document.thumbnail.height,
          }
        : undefined,
      ...ephMeta,
    };
  }

  return null;
}

/**
 * Download a file from Telegram and upload to blob storage.
 * Returns structured MediaSaveResult without silent failures.
 */
export async function downloadAndStoreMedia(
  messageId: string,
  fileId: string,
  fileUniqueId: string,
  mediaType: string,
  metadata?: {
    fileName?: string;
    mimeType?: string;
    fileSize?: number;
    width?: number;
    height?: number;
    duration?: number;
    isEphemeral?: boolean;
    isViewOnce?: boolean;
    ttlSeconds?: number;
    archiveStatus?: ArchiveStatus;
  }
): Promise<MediaSaveResult> {
  const isEph = metadata?.isEphemeral ?? false;
  const isVo = metadata?.isViewOnce ?? false;

  try {
    // 1. Check idempotency: already downloaded in DB
    const existing = await prisma.messageMedia.findUnique({
      where: { id: fileUniqueId },
    }).catch(() => null);

    if (existing && existing.isDownloaded && existing.storageUrl) {
      return {
        success: true,
        status: 'ALREADY_SAVED',
        mediaId: existing.id,
        storageUrl: existing.storageUrl,
        storagePath: existing.storagePath || undefined,
      };
    }

    const bot = getBot();
    const storage = getStorage();

    // 2. Get file info from Telegram
    let file: any;
    try {
      file = await bot.api.getFile(fileId);
    } catch (tgErr: any) {
      console.error('[Media] Telegram getFile failed:', tgErr?.message);
      await recordFailedMedia(messageId, fileId, fileUniqueId, mediaType, metadata, 'TELEGRAM_FILE_ERROR', tgErr?.message);
      return {
        success: false,
        status: 'TELEGRAM_FILE_ERROR',
        errorCode: 'TELEGRAM_FILE_ERROR',
        error: tgErr?.description || tgErr?.message || 'Telegram getFile failed',
      };
    }

    if (!file?.file_path) {
      console.error('[Media] No file_path returned for file:', fileId);
      await recordFailedMedia(messageId, fileId, fileUniqueId, mediaType, metadata, 'TELEGRAM_FILE_ERROR', 'No file_path returned');
      return {
        success: false,
        status: 'TELEGRAM_FILE_ERROR',
        errorCode: 'NO_FILE_PATH',
        error: `No file_path returned by Telegram for file ${fileId}`,
      };
    }

    // 3. Download from Telegram
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const downloadUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;

    let response: Response;
    try {
      response = await fetch(downloadUrl);
    } catch (fetchErr: any) {
      console.error('[Media] Fetch error downloading file:', fetchErr);
      await recordFailedMedia(messageId, fileId, fileUniqueId, mediaType, metadata, 'DOWNLOAD_ERROR', fetchErr?.message);
      return {
        success: false,
        status: 'DOWNLOAD_ERROR',
        errorCode: 'NETWORK_FETCH_ERROR',
        error: fetchErr?.message || 'Network error fetching file from Telegram',
      };
    }

    if (!response.ok) {
      console.error('[Media] Failed to download file HTTP:', response.status);
      await recordFailedMedia(messageId, fileId, fileUniqueId, mediaType, metadata, 'DOWNLOAD_ERROR', `HTTP ${response.status}`);
      return {
        success: false,
        status: 'DOWNLOAD_ERROR',
        errorCode: `HTTP_${response.status}`,
        error: `Telegram download endpoint returned HTTP ${response.status}`,
      };
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    // 4. Determine storage path
    const ext = file.file_path.split('.').pop() ?? 'bin';
    const sanitizedName = (metadata?.fileName ?? fileUniqueId)
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .substring(0, 100);
    const storagePath = `media/${messageId}/${sanitizedName}.${ext}`;

    // 5. Upload to storage
    let stored: { url: string; path?: string };
    try {
      stored = await storage.upload(storagePath, buffer, {
        contentType: metadata?.mimeType ?? 'application/octet-stream',
      });
    } catch (uploadErr: any) {
      console.error('[Media] Storage upload failed:', uploadErr);
      await recordFailedMedia(messageId, fileId, fileUniqueId, mediaType, metadata, 'STORAGE_ERROR', uploadErr?.message);
      return {
        success: false,
        status: 'STORAGE_ERROR',
        errorCode: 'STORAGE_UPLOAD_FAILED',
        error: uploadErr?.message || 'Storage upload failed',
      };
    }

    // 6. Save media record in DB
    try {
      const savedMedia = await prisma.messageMedia.upsert({
        where: {
          id: fileUniqueId,
        },
        create: {
          messageId,
          telegramFileId: fileId,
          fileUniqueId,
          mediaType,
          fileName: metadata?.fileName,
          mimeType: metadata?.mimeType,
          fileSize: metadata?.fileSize ?? buffer.length,
          width: metadata?.width,
          height: metadata?.height,
          duration: metadata?.duration,
          storagePath,
          storageUrl: stored.url,
          isDownloaded: true,
          isEphemeral: isEph,
          isViewOnce: isVo,
          ttlSeconds: metadata?.ttlSeconds,
          archiveStatus: isEph ? 'ARCHIVED' : 'AVAILABLE',
          archivedAt: isEph ? new Date() : undefined,
          ephemeralDetectedAt: isEph ? new Date() : undefined,
        },
        update: {
          storagePath,
          storageUrl: stored.url,
          isDownloaded: true,
          isEphemeral: isEph,
          isViewOnce: isVo,
          ttlSeconds: metadata?.ttlSeconds,
          archiveStatus: isEph ? 'ARCHIVED' : 'AVAILABLE',
          archivedAt: isEph ? new Date() : undefined,
        },
      });

      // Update chat media counter
      const message = await prisma.message.findUnique({
        where: { id: messageId },
        select: { chatId: true },
      });

      if (message && typeof prisma.chat?.update === 'function') {
        try {
          await prisma.chat.update({
            where: { id: message.chatId },
            data: { mediaCount: { increment: 1 } },
          });
        } catch {
          // Non-critical chat counter
        }
      }

      return {
        success: true,
        status: 'SAVED',
        mediaId: savedMedia.id,
        storageUrl: stored.url,
        storagePath,
      };
    } catch (dbErr: any) {
      console.error('[Media] Database upsert failed:', dbErr);
      return {
        success: false,
        status: 'DB_ERROR',
        errorCode: 'DATABASE_UPSERT_FAILED',
        error: dbErr?.message || 'Failed to update database record for media',
      };
    }
  } catch (error: any) {
    console.error('[Media] Unexpected error in downloadAndStoreMedia:', error);
    await recordFailedMedia(messageId, fileId, fileUniqueId, mediaType, metadata, 'UNAVAILABLE', error?.message);
    return {
      success: false,
      status: 'UNAVAILABLE',
      errorCode: 'UNEXPECTED_ERROR',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Helper to record failed media attempt in DB so reference is not lost.
 */
async function recordFailedMedia(
  messageId: string,
  fileId: string,
  fileUniqueId: string,
  mediaType: string,
  metadata: any,
  _status: MediaSaveStatus,
  errorMessage?: string
): Promise<void> {
  const isEph = metadata?.isEphemeral ?? false;
  const isVo = metadata?.isViewOnce ?? false;

  try {
    await prisma.messageMedia.upsert({
      where: { id: fileUniqueId },
      create: {
        messageId,
        telegramFileId: fileId,
        fileUniqueId,
        mediaType,
        fileName: metadata?.fileName,
        mimeType: metadata?.mimeType,
        fileSize: metadata?.fileSize,
        width: metadata?.width,
        height: metadata?.height,
        duration: metadata?.duration,
        isDownloaded: false,
        isEphemeral: isEph,
        isViewOnce: isVo,
        ttlSeconds: metadata?.ttlSeconds,
        archiveStatus: isEph ? 'FAILED' : 'UNAVAILABLE',
        archiveError: errorMessage || 'Download failed',
        ephemeralDetectedAt: isEph ? new Date() : undefined,
      },
      update: {
        isEphemeral: isEph,
        isViewOnce: isVo,
        ttlSeconds: metadata?.ttlSeconds,
        archiveStatus: isEph ? 'FAILED' : undefined,
        archiveError: errorMessage || undefined,
      },
    });
  } catch {
    // Non-critical persistence
  }
}

/**
 * Get secure media URL for an authenticated user.
 * Verifies ownership before returning the URL.
 */
export async function getSecureMediaUrl(
  mediaId: string,
  userId: string
): Promise<string | null> {
  const media = await prisma.messageMedia.findFirst({
    where: {
      id: mediaId,
      message: {
        chat: {
          connection: { userId },
        },
      },
    },
  });

  if (!media?.storageUrl) return null;
  return media.storageUrl;
}
