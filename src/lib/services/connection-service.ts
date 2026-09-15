// ============================================================
// SerkoGram — Connection Service (Connected Business Bot)
// Official Telegram Business / Chat Automation Architecture
// ============================================================

import { prisma } from '@/lib/db';
import { getBot } from '@/lib/telegram/bot';
import {
  saveMessage,
  processEditedMessage,
  processDeletedMessages,
} from './message-service';
import type { BusinessConnection, Chat, ConnectionStatus } from '@prisma/client';

// ============================================================
// Real Authoritative Telegram Business Connection State
// ============================================================

const bcCache = new Map<string, { data: any; expires: number }>();

/**
 * Fetches the real, authoritative business connection state directly from Telegram Bot API.
 * Uses a short 60s memory cache to prevent API rate limiting.
 */
export async function getRealTelegramBusinessConnection(businessConnectionId: string): Promise<{
  id: string;
  user: { id: number; first_name: string; last_name?: string; username?: string; is_premium?: boolean };
  user_chat_id: number;
  can_reply: boolean;
  is_enabled: boolean;
  date: number;
} | null> {
  if (!businessConnectionId) return null;

  const cached = bcCache.get(businessConnectionId);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  try {
    const bot = getBot();
    const bc = await bot.api.getBusinessConnection(businessConnectionId);
    bcCache.set(businessConnectionId, { data: bc, expires: Date.now() + 60_000 });
    return bc as any;
  } catch (err: any) {
    console.warn('[BusinessConnection] Telegram API getBusinessConnection note:', err?.description || err?.message);
    return null;
  }
}

export interface BusinessRights {
  canReply: boolean;
  readMessages: boolean;
  deleteSentMessages: boolean;
  deleteReceivedMessages: boolean;
  isEnabled: boolean;
}

/**
 * Checks actual Telegram Business rights for a connection.
 * Prioritizes authoritative Telegram state over local DB cache.
 */
export async function getBusinessRights(
  connectionId: string,
  telegramConnectionId?: string
): Promise<BusinessRights> {
  if (telegramConnectionId) {
    const real = await getRealTelegramBusinessConnection(telegramConnectionId);
    if (real) {
      return {
        canReply: Boolean(real.can_reply),
        readMessages: Boolean(real.is_enabled),
        deleteSentMessages: Boolean(real.can_reply),
        deleteReceivedMessages: Boolean(real.can_reply),
        isEnabled: Boolean(real.is_enabled),
      };
    }
  }

  const conn = await prisma.businessConnection.findUnique({
    where: { id: connectionId },
  });

  return {
    canReply: conn?.canReply ?? false,
    readMessages: conn?.isEnabled ?? false,
    deleteSentMessages: conn?.canReply ?? false,
    deleteReceivedMessages: conn?.canReply ?? false,
    isEnabled: conn?.isEnabled ?? false,
  };
}

// ============================================================
// Adapter Interface
// ============================================================

export interface ConnectionPermission {
  key: string;
  label: string;
  granted: boolean;
}

export interface ConnectionAdapter {
  getConnection(userId: string): Promise<BusinessConnection | null>;
  getChats(connectionId: string): Promise<Chat[]>;
  getPermissions(connectionId: string): Promise<ConnectionPermission[]>;
  getStatus(connectionId: string): Promise<ConnectionStatus>;
  disconnect(connectionId: string): Promise<void>;
  processMessage(chatId: string, messageData: any): Promise<any>;
  processEdit(chatId: string, editData: any): Promise<void>;
  processDelete(chatId: string, messageIds: number[]): Promise<void>;
}

// ============================================================
// Real Connected Business Bot Adapter (Official Chat Automation)
// ============================================================

export class ConnectedBusinessBotAdapter implements ConnectionAdapter {
  async getConnection(userId: string): Promise<BusinessConnection | null> {
    return prisma.businessConnection.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getChats(connectionId: string): Promise<Chat[]> {
    return prisma.chat.findMany({
      where: { connectionId },
      orderBy: { lastMessageAt: 'desc' },
    });
  }

  async getPermissions(connectionId: string): Promise<ConnectionPermission[]> {
    const conn = await prisma.businessConnection.findUnique({
      where: { id: connectionId },
    });

    const rights = await getBusinessRights(connectionId, conn?.telegramConnectionId);

    return [
      {
        key: 'read_messages',
        label: 'Чтение сообщений в выбранных чатах',
        granted: rights.readMessages,
      },
      {
        key: 'receive_deletions',
        label: 'Получение удалённых сообщений',
        granted: rights.readMessages,
      },
      {
        key: 'can_reply',
        label: 'Отправка ответов и команд (can_reply)',
        granted: rights.canReply,
      },
      {
        key: 'selected_chats',
        label: 'Активное подключение к Telegram Business',
        granted: rights.isEnabled,
      },
    ];
  }

  async getStatus(connectionId: string): Promise<ConnectionStatus> {
    const conn = await prisma.businessConnection.findUnique({
      where: { id: connectionId },
    });
    if (!conn) return 'DISCONNECTED';

    if (conn.telegramConnectionId) {
      const real = await getRealTelegramBusinessConnection(conn.telegramConnectionId);
      if (real) {
        return real.is_enabled ? 'ACTIVE' : 'DISCONNECTED';
      }
    }

    return conn.status;
  }

  async disconnect(connectionId: string): Promise<void> {
    await prisma.businessConnection.update({
      where: { id: connectionId },
      data: {
        status: 'DISCONNECTED',
        isEnabled: false,
        disconnectedAt: new Date(),
      },
    });
  }

  async processMessage(chatId: string, messageData: any): Promise<any> {
    return saveMessage({ ...messageData, chatId });
  }

  async processEdit(chatId: string, editData: any): Promise<void> {
    await processEditedMessage({ ...editData, chatId });
  }

  async processDelete(chatId: string, messageIds: number[]): Promise<void> {
    await processDeletedMessages(chatId, messageIds, new Date());
  }
}

// ============================================================
// Mode D Adapter (Account-Level MTProto Userbot — Unsupported on Serverless)
// ============================================================

export class AccountAutomationAdapter implements ConnectionAdapter {
  async getConnection(_userId: string): Promise<BusinessConnection | null> {
    return null;
  }

  async getAccount(_userId: string) {
    return null;
  }

  async getChats(_connectionId: string): Promise<Chat[]> {
    return [];
  }

  async getPermissions(_connectionId: string): Promise<ConnectionPermission[]> {
    return [
      {
        key: 'mtproto_session',
        label: 'MTProto Userbot (Недоступен на Serverless: требуется выделенный worker daemon)',
        granted: false,
      },
      {
        key: 'read_dialogs',
        label: 'Чтение личных диалогов (Работает через Telegram Business)',
        granted: false,
      },
      {
        key: 'dot_commands',
        label: 'Точечные команды (.) в чатах (Работают через Telegram Business Bot)',
        granted: true,
      },
      {
        key: 'ephemeral_save',
        label: 'Сохранение одноразовых фото/видео (Работает через Telegram Business Bot)',
        granted: true,
      },
    ];
  }

  async getStatus(_connectionId: string): Promise<ConnectionStatus> {
    return 'DISCONNECTED';
  }

  async disconnect(_connectionId: string): Promise<void> {
    // No-op for unsupported MTProto
  }

  async processMessage(chatId: string, messageData: any): Promise<any> {
    return saveMessage({ ...messageData, chatId });
  }

  async processEdit(chatId: string, editData: any): Promise<void> {
    await processEditedMessage({ ...editData, chatId });
  }

  async processDelete(chatId: string, messageIds: number[]): Promise<void> {
    await processDeletedMessages(chatId, messageIds, new Date());
  }
}

// Backward-compatible alias
export const BusinessAdapter = ConnectedBusinessBotAdapter;
export const ChatAutomationAdapter = ConnectedBusinessBotAdapter;

// ============================================================
// Factory
// ============================================================

export function getAdapter(type: 'BUSINESS' | 'CHAT_AUTOMATION' | 'ACCOUNT'): ConnectionAdapter {
  switch (type) {
    case 'BUSINESS':
    case 'CHAT_AUTOMATION':
      return new ConnectedBusinessBotAdapter();
    case 'ACCOUNT':
      return new AccountAutomationAdapter();
    default:
      return new ConnectedBusinessBotAdapter();
  }
}