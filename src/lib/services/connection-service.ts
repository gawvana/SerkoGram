// ============================================================
// SerkoGram — Connection Service (Adapter Pattern)
// Provides a unified interface for Business and Chat Automation
// ============================================================

import { prisma } from '@/lib/db';
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
  disconnect(connectionId: string): Promise<void>;
  getStatus(connectionId: string): Promise<ConnectionStatus>;
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
        granted: true, // Business connections always receive messages
      },
      {
        key: 'receive_deletions',
        label: 'Получение удалений',
        granted: true, // Business connections always receive deletion updates
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

  async getStatus(connectionId: string): Promise<ConnectionStatus> {
    const conn = await prisma.businessConnection.findUnique({
      where: { id: connectionId },
    });
    return conn?.status ?? 'DISCONNECTED';
  }
}

// ============================================================
// Chat Automation Adapter (Extensible Stub)
// ============================================================

/**
 * Chat Automation adapter.
 *
 * This adapter represents an extensible architecture point for future
 * Telegram Chat Automation capabilities. Currently, the full Chat Automation
 * functionality is not available through the standard Telegram Bot API.
 *
 * The adapter is designed to be easily extended when official API support
 * becomes available, without requiring changes to the rest of the system.
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
    // Chat Automation permissions are not yet fully supported
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

  async getStatus(connectionId: string): Promise<ConnectionStatus> {
    const conn = await prisma.businessConnection.findUnique({
      where: { id: connectionId },
    });
    return conn?.status ?? 'DISCONNECTED';
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
