// ============================================================
// SerkoGram — Unified Command Context Resolver
// Single authoritative source for resolving message context,
// owner identity, and command parsing across all chat types.
// ============================================================

import type { Message as TgMessage } from 'grammy/types';
import { parseAnyCommand, type ParsedCommandResult } from './parser';

export interface NormalizedCommandContext {
  ownerId: string;                   // Internal DB user ID of connection owner (cuid)
  telegramOwnerId: bigint;           // Telegram user ID of owner (e.g. 12345678)
  telegramSenderId: bigint;          // Telegram user ID of message sender
  businessConnectionId?: string;     // Telegram business connection ID (if business chat)
  chatId: string;                    // Internal DB chat ID (cuid)
  telegramChatId: bigint;            // Telegram chat ID
  messageId: number;                 // Telegram message ID
  messageText?: string;              // Raw text of the message (if any)
  messageCaption?: string;           // Raw caption of the message (if any)
  effectiveText: string;             // Text or caption used for command evaluation
  replyMessage?: any;                // Raw reply_to_message object if present
  replyMessageId?: number;           // ID of replied-to message if present
  isOwnerMessage: boolean;           // Authoritative check: sender is the business owner
  isIncomingMessage: boolean;        // Sender is interlocutor / external user
  isCommand: boolean;                // Whether message is a valid dot or slash command
  prefix?: '.' | '/';                // Command prefix
  commandName: string;               // Normalized lowercase command name
  args: string[];                    // Whitespace-split arguments
  rawArguments: string;              // Everything after command name, trimmed
  payload?: string;                  // Payload for /start or deep-links
  chatTitle: string;                 // Chat title or interlocutor name
  isDirectBotChat: boolean;          // True if in direct DM with bot, false if managed chat
}

export interface ResolveCommandContextOptions {
  msg: TgMessage;
  chatId: string;
  telegramChatId: bigint;
  connection?: {
    userId: string;
    user?: {
      telegramId: bigint | string | number;
    } | null;
  } | null;
  realBc?: {
    user?: {
      id: number | bigint | string;
    };
  } | null;
  ownerTelegramId?: bigint;
  ownerUserId?: string;
  isDirectBotChat?: boolean;
  botUsername?: string;
}

/**
 * Resolves a normalized command context from a Telegram message.
 *
 * CRITICAL INVARIANT:
 * - NEVER compares internal database user ID (string cuid) with Telegram user ID (BigInt).
 * - Always inspects msg.text AND msg.caption so commands with photos/videos are not dropped.
 * - Accurately differentiates owner messages from incoming partner messages.
 */
export function resolveCommandContext(
  options: ResolveCommandContextOptions
): NormalizedCommandContext {
  const {
    msg,
    chatId,
    telegramChatId,
    connection,
    realBc,
    isDirectBotChat = false,
    botUsername = process.env.TELEGRAM_BOT_USERNAME || 'SerkoGram_bot',
  } = options;

  // 1. Authoritative Telegram Owner ID resolution
  let resolvedTelegramOwnerId = BigInt(0);
  if (options.ownerTelegramId && options.ownerTelegramId > BigInt(0)) {
    resolvedTelegramOwnerId = options.ownerTelegramId;
  } else if (realBc?.user?.id) {
    resolvedTelegramOwnerId = BigInt(realBc.user.id);
  } else if (connection?.user?.telegramId) {
    resolvedTelegramOwnerId = BigInt(connection.user.telegramId);
  } else if (isDirectBotChat && msg.from) {
    resolvedTelegramOwnerId = BigInt(msg.from.id);
  }

  // 2. Sender Telegram ID
  const telegramSenderId = msg.from ? BigInt(msg.from.id) : BigInt(0);

  // 3. Internal DB Owner ID (cuid)
  const ownerId = options.ownerUserId || connection?.userId || '';

  // 4. Outgoing / Owner detection
  // In Telegram Bot API 7.2+:
  // - msg.is_from_offline is true when business account owner sent message from official client
  // - msg.from.id matches the owner's Telegram ID
  // - In private chats, msg.chat.id is the interlocutor's ID; if sender ID !== chat ID, it is the owner
  const isOwnerMessage =
    isDirectBotChat ||
    msg.is_from_offline === true ||
    (resolvedTelegramOwnerId > BigInt(0) && telegramSenderId > BigInt(0) && telegramSenderId === resolvedTelegramOwnerId) ||
    (msg.chat.type === 'private' && telegramSenderId > BigInt(0) && telegramSenderId !== BigInt(msg.chat.id));

  const isIncomingMessage = !isOwnerMessage;

  // 5. Text extraction (support both text and caption for media commands)
  const rawText = msg.text || undefined;
  const rawCaption = msg.caption || undefined;
  const effectiveText = (rawText || rawCaption || '').trim();

  // 6. Command parsing
  const parsed: ParsedCommandResult = parseAnyCommand(effectiveText, {
    allowedPrefixes: ['.', '/'],
    currentBotUsername: botUsername,
    chatId,
    senderId: msg.from?.id,
    replyToMessageId: msg.reply_to_message?.message_id,
  });

  // 7. Chat title resolution
  const chatTitle =
    msg.chat.title ||
    [msg.chat.first_name, msg.chat.last_name].filter(Boolean).join(' ') ||
    'Диалог';

  return {
    ownerId,
    telegramOwnerId: resolvedTelegramOwnerId,
    telegramSenderId,
    businessConnectionId: msg.business_connection_id,
    chatId,
    telegramChatId,
    messageId: msg.message_id,
    messageText: rawText,
    messageCaption: rawCaption,
    effectiveText,
    replyMessage: msg.reply_to_message,
    replyMessageId: msg.reply_to_message?.message_id,
    isOwnerMessage,
    isIncomingMessage,
    isCommand: parsed.isCommand,
    prefix: parsed.prefix,
    commandName: parsed.command,
    args: parsed.arguments,
    rawArguments: parsed.rawArguments,
    payload: parsed.payload,
    chatTitle,
    isDirectBotChat,
  };
}
