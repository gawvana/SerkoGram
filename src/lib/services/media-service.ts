// ============================================================
// SerkoGram — Media Service
// Downloads media from Telegram and stores in blob storage
// ============================================================

import { prisma } from '@/lib/db';
import { getBot } from '@/lib/telegram/bot';
import { getStorage } from './storage-service';

/**
 * Download a file from Telegram and upload to blob storage.
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
  }
): Promise<void> {
  try {
    const bot = getBot();
    const storage = getStorage();

    // Get file info from Telegram
    const file = await bot.api.getFile(fileId);

    if (!file.file_path) {
      console.error('[Media] No file_path returned for file:', fileId);
      return;
    }

    // Download from Telegram
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const downloadUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;

    const response = await fetch(downloadUrl);
    if (!response.ok) {
      console.error('[Media] Failed to download file:', response.status);
      return;
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    // Determine storage path
    const ext = file.file_path.split('.').pop() ?? 'bin';
    const sanitizedName = (metadata?.fileName ?? fileUniqueId)
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .substring(0, 100);
    const storagePath = `media/${messageId}/${sanitizedName}.${ext}`;

    // Upload to storage
    const stored = await storage.upload(storagePath, buffer, {
      contentType: metadata?.mimeType ?? 'application/octet-stream',
    });

    // Save media record
    await prisma.messageMedia.upsert({
      where: {
        id: fileUniqueId, // Using file_unique_id for idempotency
      },
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
        storagePath,
        storageUrl: stored.url,
        isDownloaded: true,
      },
      update: {
        storagePath,
        storageUrl: stored.url,
        isDownloaded: true,
      },
    });

    // Update chat media counter
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: { chatId: true },
    });

    if (message) {
      await prisma.chat.update({
        where: { id: message.chatId },
        data: { mediaCount: { increment: 1 } },
      });
    }
  } catch (error) {
    console.error('[Media] Error downloading/storing media:', error);

    // Still save the reference even if download failed
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
      },
      update: {},
    });
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
