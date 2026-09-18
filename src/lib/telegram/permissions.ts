// ============================================================
// SerkoGram — Permissions Engine
// Evaluates independent Telegram BusinessBotRights strictly per operation
// ============================================================

import type { BusinessBotRights } from './types';

export type AutomationFeature =
  | 'archive_read'
  | 'auto_save'
  | 'reply'
  | 'delete_own_message'
  | 'delete_other_message';

export const FEATURE_REQUIRED_RIGHTS: Record<AutomationFeature, keyof BusinessBotRights> = {
  archive_read: 'can_read_messages',
  auto_save: 'can_read_messages',
  reply: 'can_reply',
  delete_own_message: 'can_delete_sent_messages',
  delete_other_message: 'can_delete_all_messages',
};

export interface PermissionCheckResult {
  granted: boolean;
  feature: AutomationFeature;
  requiredRight: keyof BusinessBotRights;
  errorCode?: 'PERMISSION_MISSING';
  errorMessage?: string;
  localizedMissingRight?: {
    ru: string;
    en: string;
    uz: string;
  };
}

export const MISSING_RIGHT_LABELS: Record<
  keyof BusinessBotRights,
  { ru: string; en: string; uz: string }
> = {
  can_read_messages: {
    ru: 'читать сообщения (can_read_messages)',
    en: 'read messages (can_read_messages)',
    uz: "xabarlarni o'qish (can_read_messages)",
  },
  can_reply: {
    ru: 'отвечать на сообщения (can_reply)',
    en: 'reply to messages (can_reply)',
    uz: 'xabarlarga javob berish (can_reply)',
  },
  can_delete_sent_messages: {
    ru: 'удалять сообщения бота (can_delete_sent_messages)',
    en: 'delete sent messages (can_delete_sent_messages)',
    uz: "yuborilgan xabarlarni o'chirish (can_delete_sent_messages)",
  },
  can_delete_all_messages: {
    ru: 'удалять чужие сообщения (can_delete_all_messages)',
    en: 'delete all messages (can_delete_all_messages)',
    uz: "barcha xabarlarni o'chirish (can_delete_all_messages)",
  },
  can_delete_outgoing_messages: {
    ru: 'удалять исходящие сообщения (can_delete_outgoing_messages)',
    en: 'delete outgoing messages (can_delete_outgoing_messages)',
    uz: "chiquvchi xabarlarni o'chirish (can_delete_outgoing_messages)",
  },
  can_edit_name: {
    ru: 'изменять имя аккаунта (can_edit_name)',
    en: 'edit account name (can_edit_name)',
    uz: "hisob nomini o'zgartirish (can_edit_name)",
  },
  can_edit_bio: {
    ru: 'изменять описание (can_edit_bio)',
    en: 'edit bio (can_edit_bio)',
    uz: "bioni o'zgartirish (can_edit_bio)",
  },
  can_edit_profile_photo: {
    ru: 'изменять фото профиля (can_edit_profile_photo)',
    en: 'edit profile photo (can_edit_profile_photo)',
    uz: "profil rasmini o'zgartirish (can_edit_profile_photo)",
  },
  can_edit_username: {
    ru: 'изменять имя пользователя (can_edit_username)',
    en: 'edit username (can_edit_username)',
    uz: "foydalanuvchi nomini o'zgartirish (can_edit_username)",
  },
  can_change_gift_settings: {
    ru: 'изменять настройки подарков (can_change_gift_settings)',
    en: 'change gift settings (can_change_gift_settings)',
    uz: "sovg'alar sozlamalarini o'zgartirish (can_change_gift_settings)",
  },
  can_view_gifts_and_stars: {
    ru: 'просматривать подарки и звёзды (can_view_gifts_and_stars)',
    en: 'view gifts and stars (can_view_gifts_and_stars)',
    uz: "sovg'alar va yulduzlarni ko'rish (can_view_gifts_and_stars)",
  },
  can_convert_gifts_to_stars: {
    ru: 'конвертировать подарки в звёзды (can_convert_gifts_to_stars)',
    en: 'convert gifts to stars (can_convert_gifts_to_stars)',
    uz: "sovg'alarni yulduzlarga aylantirish (can_convert_gifts_to_stars)",
  },
  can_transfer_and_upgrade_gifts: {
    ru: 'передавать и улучшать подарки (can_transfer_and_upgrade_gifts)',
    en: 'transfer and upgrade gifts (can_transfer_and_upgrade_gifts)',
    uz: "sovg'alarni o'tkazish va yangilash (can_transfer_and_upgrade_gifts)",
  },
  can_transfer_stars: {
    ru: 'передавать звёзды (can_transfer_stars)',
    en: 'transfer stars (can_transfer_stars)',
    uz: "yulduzlarni o'tkazish (can_transfer_stars)",
  },
  can_manage_stories: {
    ru: 'управлять историями (can_manage_stories)',
    en: 'manage stories (can_manage_stories)',
    uz: "hikoyalarni boshqarish (can_manage_stories)",
  },
};

/**
 * Checks if a specific feature is permitted under the given rights snapshot.
 * Treats every right as strictly independent. Never assumes one implies another.
 */
export function checkFeaturePermission(
  feature: AutomationFeature,
  rights: BusinessBotRights | null | undefined
): PermissionCheckResult {
  const requiredRight = FEATURE_REQUIRED_RIGHTS[feature];
  const granted = Boolean(rights && rights[requiredRight] === true);

  if (!granted) {
    const localized = MISSING_RIGHT_LABELS[requiredRight] || {
      ru: requiredRight,
      en: requiredRight,
      uz: requiredRight,
    };
    return {
      granted: false,
      feature,
      requiredRight,
      errorCode: 'PERMISSION_MISSING',
      errorMessage: `Feature "${feature}" requires Telegram right: ${requiredRight}`,
      localizedMissingRight: localized,
    };
  }

  return {
    granted: true,
    feature,
    requiredRight,
  };
}

/**
 * Validates multiple required features, returning the first missing permission or success.
 */
export function checkFeaturesPermissions(
  features: AutomationFeature[],
  rights: BusinessBotRights | null | undefined
): PermissionCheckResult {
  for (const feat of features) {
    const res = checkFeaturePermission(feat, rights);
    if (!res.granted) return res;
  }
  return {
    granted: true,
    feature: features[0] || 'auto_save',
    requiredRight: FEATURE_REQUIRED_RIGHTS[features[0] || 'auto_save'],
  };
}
