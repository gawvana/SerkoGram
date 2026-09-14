// ============================================================
// SerkoGram — Core Type Definitions
// ============================================================

import type {
  User,
  BusinessConnection,
  Chat,
  ChatMember,
  Message,
  MessageVersion,
  MessageMedia,
  MessageDeletion,
  UserSettings,
  PrivacySettings,
  SupportTicket,
  SupportMessage,
  AuditLog,
  MessageType,
  TicketStatus,
  TicketCategory,
  ConnectionStatus,
  RetentionPeriod,
} from '@prisma/client';

// Re-export Prisma types
export type {
  User,
  BusinessConnection,
  Chat,
  ChatMember,
  Message,
  MessageVersion,
  MessageMedia,
  MessageDeletion,
  UserSettings,
  PrivacySettings,
  SupportTicket,
  SupportMessage,
  AuditLog,
};

export {
  MessageType,
  TicketStatus,
  TicketCategory,
  ConnectionStatus,
  RetentionPeriod,
} from '@prisma/client';

// ============================================================
// API Types
// ============================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
  total?: number;
}

export interface PaginationParams {
  cursor?: string;
  limit?: number;
}

// ============================================================
// Auth Types
// ============================================================

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

export interface TelegramInitData {
  query_id?: string;
  user?: TelegramUser;
  auth_date: number;
  hash: string;
}

export interface SessionPayload {
  userId: string;
  telegramId: number;
  isAdmin: boolean;
  expiresAt: number;
}

// ============================================================
// Dashboard / Stats Types
// ============================================================

export interface DashboardStats {
  totalMessages: number;
  receivedMessages: number;
  sentMessages: number;
  deletedMessages: number;
  editedMessages: number;
  mediaCount: number;
}

export interface ActivityDataPoint {
  date: string;
  count: number;
}

// ============================================================
// Chat Types (API response shapes)
// ============================================================

export interface ChatListItem {
  id: string;
  telegramChatId: string;
  title: string | null;
  chatType: string;
  photoUrl: string | null;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  totalMessages: number;
  deletedMessages: number;
  editedMessages: number;
  mediaCount: number;
}

export interface MessageItem {
  id: string;
  telegramMessageId: number;
  senderName: string | null;
  senderUsername: string | null;
  isOutgoing: boolean;
  messageType: MessageType;
  text: string | null;
  caption: string | null;
  replyToMessageId: number | null;
  forwardFromName: string | null;
  isEdited: boolean;
  editedAt: string | null;
  isDeleted: boolean;
  deletedAt: string | null;
  telegramDate: string;
  media: MediaItem[];
  versionsCount?: number;
}

export interface MediaItem {
  id: string;
  mediaType: string;
  fileName: string | null;
  mimeType: string | null;
  fileSize: number | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  isDownloaded: boolean;
}

// ============================================================
// Search Types
// ============================================================

export interface SearchParams {
  query: string;
  chatId?: string;
  messageType?: MessageType;
  isDeleted?: boolean;
  dateFrom?: string;
  dateTo?: string;
  cursor?: string;
  limit?: number;
}

export interface SearchResult {
  message: MessageItem;
  chatTitle: string | null;
  highlight: string;
}

// ============================================================
// Connection Types
// ============================================================

export interface ConnectionInfo {
  id: string;
  type: string;
  status: ConnectionStatus;
  canReply: boolean;
  isEnabled: boolean;
  connectedAt: string;
  chatsCount: number;
  messagesCount: number;
}

export interface ConnectionPermission {
  key: string;
  label: string;
  granted: boolean;
}

// ============================================================
// Support Types
// ============================================================

export interface TicketListItem {
  id: string;
  category: TicketCategory;
  subject: string;
  status: TicketStatus;
  lastMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TicketDetail {
  id: string;
  category: TicketCategory;
  subject: string;
  status: TicketStatus;
  createdAt: string;
  messages: TicketMessageItem[];
}

export interface TicketMessageItem {
  id: string;
  isSupport: boolean;
  text: string;
  createdAt: string;
}

// ============================================================
// Admin Types
// ============================================================

export interface AdminDashboard {
  totalUsers: number;
  activeConnections: number;
  totalMessages: number;
  totalMedia: number;
  openTickets: number;
  recentErrors: number;
}
