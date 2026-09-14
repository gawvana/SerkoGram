// ============================================================
// SerkoGram — Connection Service (Adapter Pattern)
// Provides a unified interface for Business and Chat Automation
// ============================================================

import { prisma } from '@/lib/db';
import {
  saveMessage,
  processEditedMessage,
  processDeletedMessages,
} from './message-service';
import type { BusinessConnection, Chat, ConnectionStatus } from '@prisma/client';

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
// Business Adapter
// ============================================================

export class BusinessAdapter implements ConnectionAdapter {
  async getConnection(userId: string): Promise<BusinessConnection | null> {
    return prisma.businessConnection.findFirst({
      where: { userId, type: 'BUSINESS' },
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

    if (!conn) return [];

    return [
      {
        key: 'read_messages',
        label: 'Чтение сообщений',
        granted: true,
      },
      {
        key: 'receive_deletions',
        label: 'Получение удалений',
        granted: true,
      },
      {
        key: 'can_reply',
        label: 'Отправка ответов',
        granted: conn.canReply,
      },
      {
        key: 'selected_chats',
        label: 'Работа с выбранными чатами',
        granted: conn.isEnabled,
      },
    ];
  }

  async getStatus(connectionId: string): Promise<ConnectionStatus> {
    const conn = await prisma.businessConnection.findUnique({
      where: { id: connectionId },
    });
    return conn?.status ?? 'DISCONNECTED';
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
// Chat Automation Adapter (Extensible Architecture)
// ============================================================

/**
 * Chat Automation adapter.
 *
 * This adapter represents an extensible architecture point for future
 * Telegram Chat Automation capabilities. Currently, general user-level
 * Chat Automation is handled natively through Telegram Business Bot Connection.
 *
 * The adapter implements the uniform ConnectionAdapter interface so that when
 * extended Telegram Bot API capabilities are introduced, no core refactoring
 * is necessary.
 */
export class ChatAutomationAdapter implements ConnectionAdapter {
  async getConnection(userId: string): Promise<BusinessConnection | null> {
    return prisma.businessConnection.findFirst({
      where: { userId, type: 'CHAT_AUTOMATION' },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getChats(connectionId: string): Promise<Chat[]> {
    return prisma.chat.findMany({
      where: { connectionId },
      orderBy: { lastMessageAt: 'desc' },
    });
  }

  async getPermissions(_connectionId: string): Promise<ConnectionPermission[]> {
    return [
      {
        key: 'read_messages',
        label: 'Чтение сообщений',
        granted: false,
      },
      {
        key: 'receive_deletions',
        label: 'Получение удалений',
        granted: false,
      },
      {
        key: 'automation',
        label: 'Автоматизация',
        granted: false,
      },
    ];
  }

  async getStatus(connectionId: string): Promise<ConnectionStatus> {
    const conn = await prisma.businessConnection.findUnique({
      where: { id: connectionId },
    });
    return conn?.status ?? 'DISCONNECTED';
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
// Factory
// ============================================================

export function getAdapter(type: 'BUSINESS' | 'CHAT_AUTOMATION'): ConnectionAdapter {
  switch (type) {
    case 'BUSINESS':
      return new BusinessAdapter();
    case 'CHAT_AUTOMATION':
      return new ChatAutomationAdapter();
    default:
      return new BusinessAdapter();
  }
}