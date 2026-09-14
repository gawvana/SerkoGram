// ============================================================
// SerkoGram — Application Constants
// ============================================================

export const APP_NAME = 'SerkoGram';

export const APP_DESCRIPTION =
  'Персональный архив сообщений Telegram с отслеживанием удалённых и изменённых сообщений';

// Pagination
export const DEFAULT_PAGE_SIZE = 30;
export const MAX_PAGE_SIZE = 100;

// Auth
export const SESSION_COOKIE_NAME = 'sg_session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds
export const INIT_DATA_MAX_AGE = 60 * 60; // 1 hour — max allowed auth_date age

// Rate limiting
export const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
export const RATE_LIMIT_MAX_REQUESTS = 120;

// Media
export const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
export const ALLOWED_MEDIA_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
  'audio/mpeg',
  'audio/ogg',
  'audio/mp4',
  'application/pdf',
  'application/zip',
] as const;

// Telegram
export const TELEGRAM_API_BASE = 'https://api.telegram.org';

// Message type labels (Russian)
export const MESSAGE_TYPE_LABELS: Record<string, string> = {
  TEXT: 'Текст',
  PHOTO: 'Фото',
  VIDEO: 'Видео',
  DOCUMENT: 'Файл',
  AUDIO: 'Аудио',
  VOICE: 'Голосовое',
  VIDEO_NOTE: 'Видеосообщение',
  STICKER: 'Стикер',
  ANIMATION: 'GIF',
  CONTACT: 'Контакт',
  LOCATION: 'Локация',
  VENUE: 'Место',
  POLL: 'Опрос',
  DICE: 'Кубик',
  SERVICE: 'Служебное',
  UNKNOWN: 'Неизвестно',
};

// Ticket category labels
export const TICKET_CATEGORY_LABELS: Record<string, string> = {
  BUG: 'Ошибка',
  CONNECTION: 'Подключение',
  ARCHIVE: 'Архив',
  PAYMENT: 'Оплата',
  SUGGESTION: 'Предложение',
  OTHER: 'Другое',
};

// Ticket status labels
export const TICKET_STATUS_LABELS: Record<string, string> = {
  OPEN: 'Открыт',
  IN_PROGRESS: 'В работе',
  WAITING_USER: 'Ожидает ответа',
  RESOLVED: 'Решён',
  CLOSED: 'Закрыт',
};

// Retention period labels
export const RETENTION_LABELS: Record<string, string> = {
  DAYS_7: '7 дней',
  DAYS_30: '30 дней',
  DAYS_90: '90 дней',
  YEAR_1: '1 год',
  FOREVER: 'Навсегда',
};

// Bottom nav items
export const NAV_ITEMS = [
  { key: 'home', label: 'Главная', href: '/', icon: 'Home' },
  { key: 'archive', label: 'Архив', href: '/archive', icon: 'Archive' },
  { key: 'instructions', label: 'Инструкции', href: '/instructions', icon: 'BookOpen' },
  { key: 'faq', label: 'FAQ', href: '/faq', icon: 'HelpCircle' },
  { key: 'support', label: 'Поддержка', href: '/support', icon: 'MessageCircle' },
] as const;

// Filter options for archive
export const ARCHIVE_FILTERS = [
  { key: 'all', label: 'Все' },
  { key: 'deleted', label: 'Удалённые' },
  { key: 'edited', label: 'Изменённые' },
  { key: 'photo', label: 'Фото' },
  { key: 'video', label: 'Видео' },
  { key: 'voice', label: 'Голосовые' },
  { key: 'document', label: 'Файлы' },
  { key: 'link', label: 'Ссылки' },
] as const;
