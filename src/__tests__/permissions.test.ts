import { describe, it, expect } from 'vitest';
import {
  checkFeaturePermission,
  checkFeaturesPermissions,
  FEATURE_REQUIRED_RIGHTS,
  type AutomationFeature,
} from '@/lib/telegram/permissions';
import type { BusinessBotRights } from '@/lib/telegram/types';

describe('Permissions Engine (§8)', () => {
  const allFeatures: AutomationFeature[] = [
    'archive_read',
    'auto_save',
    'reply',
    'delete_own_message',
    'delete_other_message',
  ];

  it('correctly maps each feature to its required Telegram right', () => {
    expect(FEATURE_REQUIRED_RIGHTS.archive_read).toBe('can_read_messages');
    expect(FEATURE_REQUIRED_RIGHTS.auto_save).toBe('can_read_messages');
    expect(FEATURE_REQUIRED_RIGHTS.reply).toBe('can_reply');
    expect(FEATURE_REQUIRED_RIGHTS.delete_own_message).toBe('can_delete_sent_messages');
    expect(FEATURE_REQUIRED_RIGHTS.delete_other_message).toBe('can_delete_all_messages');
  });

  it('fails when rights object is completely missing (null/undefined)', () => {
    for (const feat of allFeatures) {
      const resNull = checkFeaturePermission(feat, null);
      expect(resNull.granted).toBe(false);
      expect(resNull.errorCode).toBe('PERMISSION_MISSING');
      expect(resNull.localizedMissingRight?.ru).toBeDefined();

      const resUndef = checkFeaturePermission(feat, undefined);
      expect(resUndef.granted).toBe(false);
      expect(resUndef.errorCode).toBe('PERMISSION_MISSING');
    }
  });

  it('fails when right is present but false', () => {
    const rights: BusinessBotRights = {
      can_read_messages: false as any,
      can_reply: false as any,
      can_delete_sent_messages: false as any,
      can_delete_all_messages: false as any,
    };

    for (const feat of allFeatures) {
      const res = checkFeaturePermission(feat, rights);
      expect(res.granted).toBe(false);
      expect(res.errorCode).toBe('PERMISSION_MISSING');
    }
  });

  it('never assumes one right implies another (can_reply does NOT grant delete or read)', () => {
    const rights: BusinessBotRights = {
      can_reply: true,
    };

    // can_reply is true
    expect(checkFeaturePermission('reply', rights).granted).toBe(true);

    // other independent rights must be false
    expect(checkFeaturePermission('archive_read', rights).granted).toBe(false);
    expect(checkFeaturePermission('auto_save', rights).granted).toBe(false);
    expect(checkFeaturePermission('delete_own_message', rights).granted).toBe(false);
    expect(checkFeaturePermission('delete_other_message', rights).granted).toBe(false);
  });

  it('succeeds when the specific right is true', () => {
    const fullRights: BusinessBotRights = {
      can_read_messages: true,
      can_reply: true,
      can_delete_sent_messages: true,
      can_delete_all_messages: true,
    };

    for (const feat of allFeatures) {
      const res = checkFeaturePermission(feat, fullRights);
      expect(res.granted).toBe(true);
      expect(res.errorCode).toBeUndefined();
    }
  });

  it('returns exact localized missing permission message', () => {
    const rights: BusinessBotRights = {
      can_reply: true,
      can_delete_sent_messages: true,
    };

    const res = checkFeaturePermission('delete_other_message', rights);
    expect(res.granted).toBe(false);
    expect(res.requiredRight).toBe('can_delete_all_messages');
    expect(res.localizedMissingRight?.ru).toBe('удалять чужие сообщения (can_delete_all_messages)');
    expect(res.localizedMissingRight?.en).toBe('delete all messages (can_delete_all_messages)');
    expect(res.localizedMissingRight?.uz).toBe("barcha xabarlarni o'chirish (can_delete_all_messages)");
  });

  it('checkFeaturesPermissions checks an array of features in order', () => {
    const partialRights: BusinessBotRights = {
      can_read_messages: true,
      can_reply: false as any,
    };

    const res = checkFeaturesPermissions(['archive_read', 'reply'], partialRights);
    expect(res.granted).toBe(false);
    expect(res.requiredRight).toBe('can_reply');
  });
});
