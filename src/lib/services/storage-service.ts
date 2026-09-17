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
  isConfigured(): boolean;
  upload(
    path: string,
    data: Buffer | ReadableStream | Blob,
    options?: { contentType?: string; access?: 'public' }
  ): Promise<StorageFile>;
  delete(url: string): Promise<void>;
  getInfo(url: string): Promise<StorageFile | null>;
  listFiles(prefix: string): Promise<StorageFile[]>;
}

export class StorageNotConfiguredError extends Error {
  constructor(
    message = 'Хранилище SerkoGram не настроено (отсутствует BLOB_READ_WRITE_TOKEN). Для сохранения медиа подключите Vercel Blob в Vercel Dashboard (Storage -> Blob -> Connect) или добавьте переменную BLOB_READ_WRITE_TOKEN в .env.'
  ) {
    super(message);
    this.name = 'StorageNotConfiguredError';
  }
}

/**
 * Diagnostic helper to check storage configuration
 */
export function getStorageDiagnostics() {
  const token = process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL_BLOB_READ_WRITE_TOKEN;
  if (!process.env.BLOB_READ_WRITE_TOKEN && token) {
    process.env.BLOB_READ_WRITE_TOKEN = token;
  }
  const configured = Boolean(token && token.trim().length > 0);
  return {
    provider: 'vercel-blob',
    configured,
    tokenPresent: Boolean(token),
    tokenLength: token ? token.length : 0,
    hint: configured
      ? 'Vercel Blob token configured successfully'
      : 'BLOB_READ_WRITE_TOKEN is missing. Connect Vercel Blob in Vercel project settings or set BLOB_READ_WRITE_TOKEN in .env',
  };
}

/**
 * Vercel Blob Storage adapter implementing StorageService interface.
 * Can be replaced with S3, Cloudflare R2, etc. by implementing the same interface.
 */
export class VercelBlobStorage implements StorageService {
  isConfigured(): boolean {
    const token = process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL_BLOB_READ_WRITE_TOKEN;
    if (!process.env.BLOB_READ_WRITE_TOKEN && token) {
      process.env.BLOB_READ_WRITE_TOKEN = token;
    }
    return Boolean(token && token.trim().length > 0);
  }

  async upload(
    path: string,
    data: Buffer | ReadableStream | Blob,
    options?: { contentType?: string; access?: 'public' }
  ): Promise<StorageFile> {
    if (!this.isConfigured()) {
      throw new StorageNotConfiguredError();
    }

    try {
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
    } catch (err: any) {
      if (
        err?.message?.includes('No token found') ||
        err?.message?.includes('BLOB_READ_WRITE_TOKEN') ||
        err?.name === 'StorageNotConfiguredError'
      ) {
        throw new StorageNotConfiguredError();
      }
      throw err;
    }
  }

  async delete(url: string): Promise<void> {
    if (!this.isConfigured()) {
      console.warn('[Storage] Cannot delete file: BLOB_READ_WRITE_TOKEN is not configured');
      return;
    }
    try {
      await del(url);
    } catch (err: any) {
      console.warn('[Storage] Error deleting blob:', err?.message);
    }
  }

  async getInfo(url: string): Promise<StorageFile | null> {
    if (!this.isConfigured()) {
      return null;
    }
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
    if (!this.isConfigured()) {
      return [];
    }
    try {
      const { blobs } = await list({ prefix });
      return blobs.map((b) => ({
        url: b.url,
        pathname: b.pathname,
        size: b.size,
        contentType: (b as any).contentType ?? 'application/octet-stream',
      }));
    } catch {
      return [];
    }
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
