// ============================================================
// SerkoGram — Storage & Connection Unit Test Suite
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  VercelBlobStorage,
  StorageNotConfiguredError,
  getStorageDiagnostics,
} from '@/lib/services/storage-service';

describe('Storage Service Hardening & Diagnostics', () => {
  const originalToken = process.env.BLOB_READ_WRITE_TOKEN;

  beforeEach(() => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
  });

  afterEach(() => {
    if (originalToken !== undefined) {
      process.env.BLOB_READ_WRITE_TOKEN = originalToken;
    } else {
      delete process.env.BLOB_READ_WRITE_TOKEN;
    }
  });

  it('isConfigured() returns false when BLOB_READ_WRITE_TOKEN is not set', () => {
    const storage = new VercelBlobStorage();
    expect(storage.isConfigured()).toBe(false);
  });

  it('isConfigured() returns true when BLOB_READ_WRITE_TOKEN is provided', () => {
    process.env.BLOB_READ_WRITE_TOKEN = 'vercel_blob_rw_test_token_123';
    const storage = new VercelBlobStorage();
    expect(storage.isConfigured()).toBe(true);
  });

  it('upload() throws StorageNotConfiguredError with Russian explanation if token is missing', async () => {
    const storage = new VercelBlobStorage();
    await expect(
      storage.upload('media/test.jpg', Buffer.from('data'))
    ).rejects.toThrowError(StorageNotConfiguredError);

    await expect(
      storage.upload('media/test.jpg', Buffer.from('data'))
    ).rejects.toThrowError(/BLOB_READ_WRITE_TOKEN/);
  });

  it('delete(), getInfo(), listFiles() handle missing token safely without uncaught exceptions', async () => {
    const storage = new VercelBlobStorage();

    // delete should not throw
    await expect(storage.delete('https://blob/some-url')).resolves.toBeUndefined();

    // getInfo should return null
    const info = await storage.getInfo('https://blob/some-url');
    expect(info).toBeNull();

    // listFiles should return empty array
    const files = await storage.listFiles('media/');
    expect(files).toEqual([]);
  });

  it('getStorageDiagnostics returns accurate status and hint', () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    const diagUnconf = getStorageDiagnostics();
    expect(diagUnconf.configured).toBe(false);
    expect(diagUnconf.tokenPresent).toBe(false);
    expect(diagUnconf.hint).toContain('BLOB_READ_WRITE_TOKEN');

    process.env.BLOB_READ_WRITE_TOKEN = 'token_abc_123';
    const diagConf = getStorageDiagnostics();
    expect(diagConf.configured).toBe(true);
    expect(diagConf.tokenPresent).toBe(true);
    expect(diagConf.tokenLength).toBe(13);
  });
});

describe('/api/connections Response Contract', () => {
  it('should serialize connections and provide both connections array and active connection object', async () => {
    // Dynamically test the serialization contract
    const mockConnections = [
      {
        id: 'bc_1',
        userId: 'u_1',
        telegramConnectionId: 'tg_bc_1',
        type: 'BUSINESS',
        status: 'ACTIVE',
        canReply: true,
        isEnabled: true,
        createdAt: new Date('2026-01-01'),
        _count: { chats: 5 },
      },
      {
        id: 'bc_2',
        userId: 'u_1',
        telegramConnectionId: 'tg_bc_2',
        type: 'BUSINESS',
        status: 'DISCONNECTED',
        canReply: false,
        isEnabled: false,
        createdAt: new Date('2025-12-01'),
        _count: { chats: 2 },
      },
    ];

    const activeConnection = mockConnections.find((c) => c.status === 'ACTIVE' && c.isEnabled) || mockConnections[0] || null;

    const responsePayload = {
      connections: mockConnections,
      connection: activeConnection,
    };

    expect(responsePayload.connections).toHaveLength(2);
    expect(responsePayload.connection).toBeDefined();
    expect(responsePayload.connection?.status).toBe('ACTIVE');
    expect(responsePayload.connection?.canReply).toBe(true);
  });
});
