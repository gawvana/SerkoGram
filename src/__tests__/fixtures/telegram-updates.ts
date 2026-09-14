// ============================================================
// SerkoGram — Test Fixtures
// Mock Telegram update objects for testing
// ============================================================

import type { Update } from 'grammy/types';

export const mockUser = {
  id: 123456789,
  is_bot: false,
  first_name: 'Тестовый',
  last_name: 'Пользователь',
  username: 'testuser',
  language_code: 'ru',
};

export const mockChat = {
  id: 987654321,
  type: 'private' as const,
  first_name: 'Александр',
  last_name: 'Иванов',
  username: 'alexander',
};

export const mockBusinessConnection: Update = {
  update_id: 100001,
  business_connection: {
    id: 'bc_test_connection_001',
    user: mockUser,
    user_chat_id: 123456789,
    date: Math.floor(Date.now() / 1000),
    rights: { can_reply: true },
    is_enabled: true,
  },
};

export const mockBusinessConnectionDisconnect: Update = {
  update_id: 100002,
  business_connection: {
    id: 'bc_test_connection_001',
    user: mockUser,
    user_chat_id: 123456789,
    date: Math.floor(Date.now() / 1000),
    rights: {},
    is_enabled: false,
  },
};

export const mockBusinessMessage: Update = {
  update_id: 100003,
  business_message: {
    message_id: 42,
    from: mockUser,
    chat: mockChat,
    date: Math.floor(Date.now() / 1000),
    text: 'Привет, как дела?',
    business_connection_id: 'bc_test_connection_001',
  },
};

export const mockBusinessMessagePhoto: Update = {
  update_id: 100004,
  business_message: {
    message_id: 43,
    from: mockUser,
    chat: mockChat,
    date: Math.floor(Date.now() / 1000),
    photo: [
      {
        file_id: 'photo_small_001',
        file_unique_id: 'photo_unique_small_001',
        width: 320,
        height: 240,
        file_size: 15000,
      },
      {
        file_id: 'photo_large_001',
        file_unique_id: 'photo_unique_large_001',
        width: 1280,
        height: 960,
        file_size: 120000,
      },
    ],
    caption: 'Красивый вид',
    business_connection_id: 'bc_test_connection_001',
  },
};

export const mockEditedBusinessMessage: Update = {
  update_id: 100005,
  edited_business_message: {
    message_id: 42,
    from: mockUser,
    chat: mockChat,
    date: Math.floor(Date.now() / 1000) - 60,
    edit_date: Math.floor(Date.now() / 1000),
    text: 'Привет, как дела? (исправлено)',
    business_connection_id: 'bc_test_connection_001',
  },
};

export const mockDeletedBusinessMessages: Update = {
  update_id: 100006,
  deleted_business_messages: {
    business_connection_id: 'bc_test_connection_001',
    chat: mockChat,
    message_ids: [42, 43],
  },
};

export const mockStartCommand: Update = {
  update_id: 100007,
  message: {
    message_id: 1,
    from: mockUser,
    chat: {
      id: 123456789,
      type: 'private',
      first_name: 'Тестовый',
      last_name: 'Пользователь',
      username: 'testuser',
    },
    date: Math.floor(Date.now() / 1000),
    text: '/start',
  },
};

export const mockCallbackQuery: Update = {
  update_id: 100008,
  callback_query: {
    id: 'cq_001',
    from: mockUser,
    chat_instance: 'instance_001',
    message: {
      message_id: 1,
      from: { id: 999999999, is_bot: true, first_name: 'SerkoGram' },
      chat: {
        id: 123456789,
        type: 'private',
        first_name: 'Тестовый',
        last_name: 'Пользователь',
        username: 'testuser',
      },
      date: Math.floor(Date.now() / 1000),
      text: 'Test',
    },
    data: 'connect',
  },
};

// Voice message
export const mockBusinessMessageVoice: Update = {
  update_id: 100009,
  business_message: {
    message_id: 44,
    from: mockUser,
    chat: mockChat,
    date: Math.floor(Date.now() / 1000),
    voice: {
      file_id: 'voice_001',
      file_unique_id: 'voice_unique_001',
      duration: 5,
      mime_type: 'audio/ogg',
      file_size: 25000,
    },
    business_connection_id: 'bc_test_connection_001',
  },
};

// Document
export const mockBusinessMessageDocument: Update = {
  update_id: 100010,
  business_message: {
    message_id: 45,
    from: mockUser,
    chat: mockChat,
    date: Math.floor(Date.now() / 1000),
    document: {
      file_id: 'doc_001',
      file_unique_id: 'doc_unique_001',
      file_name: 'report.pdf',
      mime_type: 'application/pdf',
      file_size: 500000,
    },
    business_connection_id: 'bc_test_connection_001',
  },
};
