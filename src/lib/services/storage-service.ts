// ============================================================
// SerkoGram — Storage Service (Vercel Blob adapter)
// Abstraction layer for media storage
// ============================================================

import { put, del, list, head } from '@vercel/blob';

export interface StorageFile {
  url: string;
  pathname: string;
  size: number;
  contentType: string;
}

export interface StorageService {
  upload(
    path: string,
    data: Buffer | ReadableStream | Blob,
    options?: { contentType?: string; access?: 'public' }
  ): Promise<StorageFile>;
  delete(url: string): Promise<void>;
  getInfo(url: string): Promise<StorageFile | null>;
  listFiles(prefix: string): Promise<StorageFile[]>;
}

/**
 * Vercel Blob Storage adapter implementing StorageService interface.
 * Can be replaced with S3, Cloudflare R2, etc. by implementing the same interface.
 */
export class VercelBlobStorage implements StorageService {
  async upload(
    path: string,
    data: Buffer | ReadableStream | Blob,
    options?: { contentType?: string; access?: 'public' }
  ): Promise<StorageFile> {
    const blob = await put(path, data, {
      access: options?.access ?? 'public',
      contentType: options?.contentType,
    });

    const calculatedSize = Buffer.isBuffer(data)
      ? data.length
      : data instanceof Blob
      ? data.size
      : 0;

    return {
      url: blob.url,
      pathname: blob.pathname,
      size: (blob as any).size ?? calculatedSize,
      contentType: blob.contentType ?? options?.contentType ?? 'application/octet-stream',
    };
  }

  async delete(url: string): Promise<void> {
    await del(url);
  }

  async getInfo(url: string): Promise<StorageFile | null> {
    try {
      const blob = await head(url);
      return {
        url: blob.url,
        pathname: blob.pathname,
        size: blob.size,
        contentType: blob.contentType ?? 'application/octet-stream',
      };
    } catch {
      return null;
    }
  }

  async listFiles(prefix: string): Promise<StorageFile[]> {
    const { blobs } = await list({ prefix });
    return blobs.map((b) => ({
      url: b.url,
      pathname: b.pathname,
      size: b.size,
      contentType: (b as any).contentType ?? 'application/octet-stream',
    }));
  }
}

// Singleton instance
let storageInstance: StorageService | null = null;

export function getStorage(): StorageService {
  if (!storageInstance) {
    storageInstance = new VercelBlobStorage();
  }
  return storageInstance;
}
