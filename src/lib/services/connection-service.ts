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
  canDeleteAllMessages: boolean;
  canDeleteOutgoingMessages: boolean;
  isEnabled: boolean;
}

/**
 * Checks actual Telegram Business rights for a connection.
 * Prioritizes authoritative Telegram state over local DB cache.
 * Strict check: does not assume can_reply grants delete permissions.
 */
export async function getBusinessRights(
  connectionId: string,
  telegramConnectionId?: string
): Promise<BusinessRights> {
  if (telegramConnectionId) {
    const real = await getRealTelegramBusinessConnection(telegramConnectionId);
    if (real) {
      const rights = (real as any).rights;
      const canDeleteAll = Boolean(rights?.can_delete_all_messages);
      const canDeleteOutgoing = Boolean(rights?.can_delete_outgoing_messages);
      const canReply = Boolean(rights?.can_reply ?? (real as any).can_reply);
      const readMessages = Boolean(rights?.can_read_messages ?? real.is_enabled);

      return {
        canReply,
        readMessages,
        deleteSentMessages: canDeleteOutgoing,
        deleteReceivedMessages: canDeleteAll,
        canDeleteAllMessages: canDeleteAll,
        canDeleteOutgoingMessages: canDeleteOutgoing,
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
    deleteSentMessages: false,
    deleteReceivedMessages: false,
    canDeleteAllMessages: false,
    canDeleteOutgoingMessages: false,
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
        key: 'can_delete_all_messages',
        label: 'Удаление сообщений собеседника (.mute/.panic)',
        granted: rights.canDeleteAllMessages,
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
// Real Chat Automation Adapter (Per-Chat Automation & Rules)
// ============================================================

export interface ChatAutomationSettings {
  autoTranslateLang?: string | null;
  muteEnabled?: boolean;
  muteUntil?: Date | null;
  panicEnabled?: boolean;
  autoTypingEnabled?: boolean;
  warningThreshold?: number;
  moderationEnabled?: boolean;
}

export class ChatAutomationAdapter implements ConnectionAdapter {
  private base = new ConnectedBusinessBotAdapter();

  async getConnection(userId: string): Promise<BusinessConnection | null> {
    return this.base.getConnection(userId);
  }

  async getChats(connectionId: string): Promise<Chat[]> {
    return this.base.getChats(connectionId);
  }

  async getPermissions(connectionId: string): Promise<ConnectionPermission[]> {
    const perms = await this.base.getPermissions(connectionId);
    return [
      ...perms,
      {
        key: 'chat_automation',
        label: 'Автоматизация в управляемых чатах (Chat Automation)',
        granted: perms.some((p) => p.key === 'can_reply' && p.granted),
      },
      {
        key: 'dot_commands',
        label: 'Точечные команды (.) в диалогах',
        granted: perms.some((p) => p.key === 'can_reply' && p.granted),
      },
    ];
  }

  async getStatus(connectionId: string): Promise<ConnectionStatus> {
    return this.base.getStatus(connectionId);
  }

  async disconnect(connectionId: string): Promise<void> {
    return this.base.disconnect(connectionId);
  }

  async processMessage(chatId: string, messageData: any): Promise<any> {
    return this.base.processMessage(chatId, messageData);
  }

  async processEdit(chatId: string, editData: any): Promise<void> {
    return this.base.processEdit(chatId, editData);
  }

  async processDelete(chatId: string, messageIds: number[]): Promise<void> {
    return this.base.processDelete(chatId, messageIds);
  }

  private fallbackSettings = new Map<string, ChatAutomationSettings>();
  private fallbackWarnings = new Map<string, { count: number; threshold: number; exceeded: boolean }>();

  async getChatSettings(chatId: string): Promise<ChatAutomationSettings> {
    try {
      if (prisma?.chatAutomationSettings) {
        const settings = await prisma.chatAutomationSettings.findUnique({
          where: { chatId },
        });
        if (settings) return settings;
      }
    } catch (e) {
      if (process.env.NODE_ENV === 'production') {
        console.error('[PRODUCTION DATABASE ERROR] Failed to load chat settings from DB:', e);
        throw e;
      }
    }
    return this.fallbackSettings.get(chatId) || {};
  }

  async setChatSettings(chatId: string, settings: Partial<ChatAutomationSettings>): Promise<void> {
    const current = this.fallbackSettings.get(chatId) || {};
    this.fallbackSettings.set(chatId, { ...current, ...settings });

    try {
      if (prisma?.chatAutomationSettings) {
        const chat = await prisma.chat?.findUnique({ where: { id: chatId } });
        const telegramChatId = chat?.telegramChatId ?? BigInt(0);

        await prisma.chatAutomationSettings.upsert({
          where: { chatId },
          update: settings,
          create: {
            chatId,
            telegramChatId,
            autoTranslateLang: settings.autoTranslateLang,
            muteEnabled: settings.muteEnabled ?? false,
            muteUntil: settings.muteUntil,
            panicEnabled: settings.panicEnabled ?? false,
            autoTypingEnabled: settings.autoTypingEnabled ?? false,
            warningThreshold: settings.warningThreshold ?? 3,
            moderationEnabled: settings.moderationEnabled ?? false,
          },
        });
      }
    } catch (e) {
      if (process.env.NODE_ENV === 'production') {
        console.error('[PRODUCTION DATABASE ERROR] Failed to persist chat settings to DB:', e);
        throw e;
      }
      console.warn('[ChatAutomation] Failed to persist chat settings to DB:', e);
    }
  }

  async addWarning(chatId: string, targetUserId: string, reason?: string): Promise<{ count: number; threshold: number; exceeded: boolean }> {
    let targetTelegramId = BigInt(0);
    try {
      if (targetUserId && targetUserId !== 'unknown') {
        targetTelegramId = BigInt(targetUserId);
      }
    } catch {
      targetTelegramId = BigInt(0);
    }

    const key = `${chatId}:${targetTelegramId.toString()}`;
    const prevFallback = this.fallbackWarnings.get(key)?.count || 0;
    const fallbackCount = prevFallback + 1;
    const currentSettings = await this.getChatSettings(chatId);
    const threshold = currentSettings.warningThreshold || 3;
    const fallbackResult = {
      count: fallbackCount,
      threshold,
      exceeded: fallbackCount >= threshold,
    };
    this.fallbackWarnings.set(key, fallbackResult);

    try {
      if (prisma?.chatWarning) {
        const warning = await prisma.chatWarning.upsert({
          where: {
            chatId_targetTelegramId: { chatId, targetTelegramId }
          },
          update: {
            count: { increment: 1 },
            reason,
          },
          create: {
            chatId,
            targetTelegramId,
            reason,
            count: 1,
          }
        });
        return { count: warning.count, threshold, exceeded: warning.count >= threshold };
      }
    } catch (e) {
      console.warn('[ChatAutomation] Failed to persist warning to DB:', e);
    }

    return fallbackResult;
  }

  async getWarnings(chatId: string, targetUserId: string): Promise<number> {
    let targetTelegramId = BigInt(0);
    try {
      if (targetUserId && targetUserId !== 'unknown') {
        targetTelegramId = BigInt(targetUserId);
      }
    } catch {
      targetTelegramId = BigInt(0);
    }

    try {
      if (prisma?.chatWarning) {
        const warning = await prisma.chatWarning.findUnique({
          where: {
            chatId_targetTelegramId: { chatId, targetTelegramId }
          }
        });
        if (warning) return warning.count;
      }
    } catch (e) {
      // Fallback
    }

    return this.fallbackWarnings.get(`${chatId}:${targetTelegramId.toString()}`)?.count || 0;
  }

  async resetWarnings(chatId: string, targetUserId: string): Promise<void> {
    let targetTelegramId = BigInt(0);
    try {
      if (targetUserId && targetUserId !== 'unknown') {
        targetTelegramId = BigInt(targetUserId);
      }
    } catch {
      targetTelegramId = BigInt(0);
    }

    this.fallbackWarnings.delete(`${chatId}:${targetTelegramId.toString()}`);

    try {
      if (prisma?.chatWarning) {
        await prisma.chatWarning.delete({
          where: {
            chatId_targetTelegramId: { chatId, targetTelegramId }
          }
        });
      }
    } catch (e) {
      // Ignore if not found
    }
  }
}

// Backward-compatible alias
export const BusinessAdapter = ConnectedBusinessBotAdapter;

// Export singleton instance for webhook automation
export const chatAutomation = new ChatAutomationAdapter();

// ============================================================
// Factory
// ============================================================

export function getAdapter(type: 'BUSINESS' | 'CHAT_AUTOMATION' | 'ACCOUNT'): ConnectionAdapter {
  switch (type) {
    case 'BUSINESS':
      return new ConnectedBusinessBotAdapter();
    case 'CHAT_AUTOMATION':
      return chatAutomation;
    default:
      return new ConnectedBusinessBotAdapter();
  }
}