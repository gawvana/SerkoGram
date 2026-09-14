// ============================================================
// SerkoGram — Webhook Processing Tests
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  mockBusinessConnection,
  mockBusinessConnectionDisconnect,
  mockBusinessMessage,
  mockBusinessMessagePhoto,
  mockEditedBusinessMessage,
  mockDeletedBusinessMessages,
  mockStartCommand,
  mockCallbackQuery,
  mockBusinessMessageVoice,
  mockBusinessMessageDocument,
} from './fixtures/telegram-updates';

describe('Telegram Update Fixtures', () => {
  it('should have valid business_connection update structure', () => {
    const update = mockBusinessConnection;
    expect(update.update_id).toBeDefined();
    expect(update.business_connection).toBeDefined();
    expect(update.business_connection!.id).toBe('bc_test_connection_001');
    expect(update.business_connection!.user.id).toBe(123456789);
    expect(update.business_connection!.is_enabled).toBe(true);
    expect(update.business_connection!.rights?.can_reply).toBe(true);
  });

  it('should have valid disconnect update', () => {
    const update = mockBusinessConnectionDisconnect;
    expect(update.business_connection!.is_enabled).toBe(false);
    expect(update.business_connection!.rights?.can_reply).toBeFalsy();
  });

  it('should have valid business_message update', () => {
    const update = mockBusinessMessage;
    expect(update.business_message).toBeDefined();
    expect(update.business_message!.text).toBe('Привет, как дела?');
    expect(update.business_message!.business_connection_id).toBe('bc_test_connection_001');
    expect(update.business_message!.from!.id).toBe(123456789);
  });

  it('should have valid photo message update', () => {
    const update = mockBusinessMessagePhoto;
    expect(update.business_message!.photo).toBeDefined();
    expect(update.business_message!.photo!.length).toBe(2);
    expect(update.business_message!.caption).toBe('Красивый вид');
  });

  it('should have valid edited message update', () => {
    const update = mockEditedBusinessMessage;
    expect(update.edited_business_message).toBeDefined();
    expect(update.edited_business_message!.edit_date).toBeDefined();
    expect(update.edited_business_message!.text).toContain('исправлено');
  });

  it('should have valid deleted messages update', () => {
    const update = mockDeletedBusinessMessages;
    expect(update.deleted_business_messages).toBeDefined();
    expect(update.deleted_business_messages!.message_ids).toEqual([42, 43]);
    expect(update.deleted_business_messages!.business_connection_id).toBe('bc_test_connection_001');
  });

  it('should have valid /start command update', () => {
    const update = mockStartCommand;
    expect(update.message).toBeDefined();
    expect(update.message!.text).toBe('/start');
  });

  it('should have valid callback_query update', () => {
    const update = mockCallbackQuery;
    expect(update.callback_query).toBeDefined();
    expect(update.callback_query!.data).toBe('connect');
  });

  it('should have valid voice message update', () => {
    const update = mockBusinessMessageVoice;
    expect(update.business_message!.voice).toBeDefined();
    expect(update.business_message!.voice!.duration).toBe(5);
  });

  it('should have valid document message update', () => {
    const update = mockBusinessMessageDocument;
    expect(update.business_message!.document).toBeDefined();
    expect(update.business_message!.document!.file_name).toBe('report.pdf');
  });

  it('all fixtures should have unique update_ids', () => {
    const allUpdates = [
      mockBusinessConnection,
      mockBusinessConnectionDisconnect,
      mockBusinessMessage,
      mockBusinessMessagePhoto,
      mockEditedBusinessMessage,
      mockDeletedBusinessMessages,
      mockStartCommand,
      mockCallbackQuery,
      mockBusinessMessageVoice,
      mockBusinessMessageDocument,
    ];

    const ids = allUpdates.map((u) => u.update_id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});

describe('Message type detection', () => {
  it('should identify text messages', () => {
    const msg = mockBusinessMessage.business_message!;
    expect(msg.text).toBeDefined();
    expect(msg.photo).toBeUndefined();
  });

  it('should identify photo messages', () => {
    const msg = mockBusinessMessagePhoto.business_message!;
    expect(msg.photo).toBeDefined();
    expect(msg.text).toBeUndefined();
  });

  it('should identify voice messages', () => {
    const msg = mockBusinessMessageVoice.business_message!;
    expect(msg.voice).toBeDefined();
  });

  it('should identify document messages', () => {
    const msg = mockBusinessMessageDocument.business_message!;
    expect(msg.document).toBeDefined();
  });
});
