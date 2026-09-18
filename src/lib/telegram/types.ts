// ============================================================
// SerkoGram — Official Telegram Bot API 10.3 Chat Automation Types
// Encoded strictly per https://core.telegram.org/bots/api
// ============================================================

import { z } from 'zod';

export const TelegramUserSchema = z.object({
  id: z.number(),
  is_bot: z.boolean().optional(),
  first_name: z.string(),
  last_name: z.string().optional(),
  username: z.string().optional(),
  language_code: z.string().optional(),
  is_premium: z.boolean().optional(),
  added_to_attachment_menu: z.boolean().optional(),
  can_join_groups: z.boolean().optional(),
  can_read_all_group_messages: z.boolean().optional(),
  supports_inline_queries: z.boolean().optional(),
  can_connect_to_business: z.boolean().optional(),
  has_main_web_app: z.boolean().optional(),
});

export type TelegramUser = z.infer<typeof TelegramUserSchema>;

export const BusinessBotRightsSchema = z.object({
  can_reply: z.boolean().optional(),
  can_read_messages: z.boolean().optional(),
  can_delete_sent_messages: z.boolean().optional(),
  can_delete_all_messages: z.boolean().optional(),
  can_delete_outgoing_messages: z.boolean().optional(),
  can_edit_name: z.boolean().optional(),
  can_edit_bio: z.boolean().optional(),
  can_edit_profile_photo: z.boolean().optional(),
  can_edit_username: z.boolean().optional(),
  can_change_gift_settings: z.boolean().optional(),
  can_view_gifts_and_stars: z.boolean().optional(),
  can_convert_gifts_to_stars: z.boolean().optional(),
  can_transfer_and_upgrade_gifts: z.boolean().optional(),
  can_transfer_stars: z.boolean().optional(),
  can_manage_stories: z.boolean().optional(),
});

export type BusinessBotRights = z.infer<typeof BusinessBotRightsSchema>;

export const BusinessConnectionSchema = z.object({
  id: z.string(),
  user: TelegramUserSchema,
  user_chat_id: z.number(),
  date: z.number(),
  rights: BusinessBotRightsSchema.optional(),
  is_enabled: z.boolean(),
});

export type BusinessConnection = z.infer<typeof BusinessConnectionSchema>;

export const TelegramChatSchema = z.object({
  id: z.number(),
  type: z.enum(['private', 'group', 'supergroup', 'channel']),
  title: z.string().optional(),
  username: z.string().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  is_forum: z.boolean().optional(),
});

export type TelegramChat = z.infer<typeof TelegramChatSchema>;

export const BusinessMessagesDeletedSchema = z.object({
  business_connection_id: z.string(),
  chat: TelegramChatSchema,
  message_ids: z.array(z.number()),
});

export type BusinessMessagesDeleted = z.infer<typeof BusinessMessagesDeletedSchema>;

// Re-export Grammy update and message types
export type { Update, Message as TelegramMessage } from 'grammy/types';
