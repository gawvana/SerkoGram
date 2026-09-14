// ============================================================
// SerkoGram — Single Source of Truth Command Registry
// ============================================================

export type CommandCategory =
  | 'main'
  | 'info'
  | 'archive'
  | 'games'
  | 'ai'
  | 'animations'
  | 'media'
  | 'fun';

export interface CommandCategoryInfo {
  id: CommandCategory;
  name: string;
  description: string;
  icon: string;
}

export const COMMAND_CATEGORIES: CommandCategoryInfo[] = [
  { id: 'main', name: 'Основные', description: 'Базовые функции и навигация', icon: 'Sparkles' },
  { id: 'info', name: 'Информация', description: 'О сервисе и справка', icon: 'Info' },
  { id: 'archive', name: 'Архив', description: 'Сообщения, удалённые и медиа', icon: 'Archive' },
  { id: 'games', name: 'Игры', description: 'Интерактивные мини-игры', icon: 'Gamepad2' },
  { id: 'ai', name: 'Нейросеть', description: 'Искусственный интеллект', icon: 'Bot' },
  { id: 'animations', name: 'Анимации', description: 'Анимированные текстовые эффекты', icon: 'Film' },
  { id: 'media', name: 'Медиа', description: 'Работа с файлами и голосом', icon: 'Image' },
  { id: 'fun', name: 'Приколы', description: 'Развлекательные команды', icon: 'Smile' },
];

export interface CommandDefinition {
  id: string;
  command: string;
  title: string;
  description: string;
  category: CommandCategory;
  usage: string;
  example: string;
  enabled: boolean;
  disabledReason?: string;
  requiresReply: boolean;
  requiresArguments: boolean;
  uiRoute?: string;
  telegramMenu: boolean;
  handlerIdentifier: string;
}

/**
 * Check if AI provider is available in current environment.
 */
export function isAiProviderConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY);
}

/**
 * The unified command registry.
 * All commands displayed in BotFather, Telegram menu, /help, /commands,
 * and Mini App catalog derive from this array.
 */
export const COMMANDS_REGISTRY: CommandDefinition[] = [
  // --- Основные ---
  {
    id: 'start',
    command: 'start',
    title: 'Старт',
    description: 'Главное меню и запуск приложения SerkoGram',
    category: 'main',
    usage: '/start [payload]',
    example: '/start',
    enabled: true,
    requiresReply: false,
    requiresArguments: false,
    uiRoute: '/',
    telegramMenu: true,
    handlerIdentifier: 'handleStart',
  },
  {
    id: 'help',
    command: 'help',
    title: 'Помощь',
    description: 'Справочное руководство и список возможностей',
    category: 'main',
    usage: '/help',
    example: '/help',
    enabled: true,
    requiresReply: false,
    requiresArguments: false,
    uiRoute: '/instructions',
    telegramMenu: true,
    handlerIdentifier: 'handleHelp',
  },
  {
    id: 'commands',
    command: 'commands',
    title: 'Каталог команд',
    description: 'Полный интерактивный каталог команд SerkoGram',
    category: 'main',
    usage: '/commands',
    example: '/commands',
    enabled: true,
    requiresReply: false,
    requiresArguments: false,
    uiRoute: '/commands',
    telegramMenu: true,
    handlerIdentifier: 'handleCommands',
  },
  {
    id: 'settings',
    command: 'settings',
    title: 'Настройки',
    description: 'Параметры архивации, автосохранение и приватность',
    category: 'main',
    usage: '/settings',
    example: '/settings',
    enabled: true,
    requiresReply: false,
    requiresArguments: false,
    uiRoute: '/settings',
    telegramMenu: true,
    handlerIdentifier: 'handleSettings',
  },

  // --- Информация ---
  {
    id: 'info',
    command: 'info',
    title: 'О сервисе',
    description: 'Информация о системе SerkoGram, безопасность и архитектура',
    category: 'info',
    usage: '/info',
    example: '/info',
    enabled: true,
    requiresReply: false,
    requiresArguments: false,
    uiRoute: '/faq',
    telegramMenu: true,
    handlerIdentifier: 'handleInfo',
  },

  // --- Архив ---
  {
    id: 'archive',
    command: 'archive',
    title: 'Архив переписки',
    description: 'Просмотр сохранённых чатов и сообщений',
    category: 'archive',
    usage: '/archive',
    example: '/archive',
    enabled: true,
    requiresReply: false,
    requiresArguments: false,
    uiRoute: '/archive',
    telegramMenu: true,
    handlerIdentifier: 'handleArchive',
  },
  {
    id: 'deleted',
    command: 'deleted',
    title: 'Удалённые сообщения',
    description: 'Список удалённых сообщений из подключённых чатов',
    category: 'archive',
    usage: '/deleted',
    example: '/deleted',
    enabled: true,
    requiresReply: false,
    requiresArguments: false,
    uiRoute: '/archive?filter=deleted',
    telegramMenu: true,
    handlerIdentifier: 'handleDeleted',
  },
  {
    id: 'media',
    command: 'media',
    title: 'Медиатека архива',
    description: 'Просмотр сохранённых фото, видео, голосовых и документов',
    category: 'archive',
    usage: '/media',
    example: '/media',
    enabled: true,
    requiresReply: false,
    requiresArguments: false,
    uiRoute: '/archive?filter=media',
    telegramMenu: true,
    handlerIdentifier: 'handleMedia',
  },
  {
    id: 'search',
    command: 'search',
    title: 'Поиск по архиву',
    description: 'Быстрый полнотекстовый поиск по тексту и подписям',
    category: 'archive',
    usage: '/search [запрос]',
    example: '/search договор',
    enabled: true,
    requiresReply: false,
    requiresArguments: false,
    uiRoute: '/archive?search=true',
    telegramMenu: true,
    handlerIdentifier: 'handleSearch',
  },

  // --- Игры ---
  {
    id: 'coin',
    command: 'coin',
    title: 'Монетка',
    description: 'Бросок монетки: Орёл или Решка',
    category: 'games',
    usage: '/coin',
    example: '/coin',
    enabled: true,
    requiresReply: false,
    requiresArguments: false,
    telegramMenu: false,
    handlerIdentifier: 'handleCoin',
  },
  {
    id: 'ttt',
    command: 'ttt',
    title: 'Крестики-нолики',
    description: 'Интерактивная игра в крестики-нолики',
    category: 'games',
    usage: '/ttt',
    example: '/ttt',
    enabled: true,
    requiresReply: false,
    requiresArguments: false,
    telegramMenu: false,
    handlerIdentifier: 'handleTicTacToe',
  },
  {
    id: 'rps',
    command: 'rps',
    title: 'Камень-Ножницы-Бумага',
    description: 'Классическая игра против бота',
    category: 'games',
    usage: '/rps [камень|ножницы|бумага]',
    example: '/rps камень',
    enabled: true,
    requiresReply: false,
    requiresArguments: false,
    telegramMenu: false,
    handlerIdentifier: 'handleRps',
  },

  // --- Нейросеть (AI) ---
  {
    id: 'gpt',
    command: 'gpt',
    title: 'Запрос к AI',
    description: 'Задать вопрос искусственному интеллекту',
    category: 'ai',
    usage: '/gpt <вопрос>',
    example: '/gpt Объясни принцип работы квантового компьютера',
    enabled: false,
    disabledReason: 'Требуется подключение AI-провайдера (OPENAI_API_KEY)',
    requiresReply: false,
    requiresArguments: true,
    telegramMenu: false,
    handlerIdentifier: 'handleGpt',
  },
  {
    id: 'a_gpt',
    command: 'a_gpt',
    title: 'Авто-AI ответчик',
    description: 'Включить автоматические AI-ответы в выбранном чате',
    category: 'ai',
    usage: '/a_gpt',
    example: '/a_gpt',
    enabled: false,
    disabledReason: 'Требуется подключение AI-провайдера (OPENAI_API_KEY)',
    requiresReply: false,
    requiresArguments: false,
    telegramMenu: false,
    handlerIdentifier: 'handleAutoGpt',
  },
  {
    id: 'a_gpt_off',
    command: 'a_gpt_off',
    title: 'Отключить Авто-AI',
    description: 'Отключить автоматические AI-ответы в чате',
    category: 'ai',
    usage: '/a_gpt_off',
    example: '/a_gpt_off',
    enabled: false,
    disabledReason: 'Требуется подключение AI-провайдера (OPENAI_API_KEY)',
    requiresReply: false,
    requiresArguments: false,
    telegramMenu: false,
    handlerIdentifier: 'handleAutoGptOff',
  },
  {
    id: 'image',
    command: 'image',
    title: 'Генерация картинок',
    description: 'Создание изображения по текстовому описанию',
    category: 'ai',
    usage: '/image <описание>',
    example: '/image Футуристический город в сумерках',
    enabled: false,
    disabledReason: 'Требуется подключение AI-провайдера (OPENAI_API_KEY)',
    requiresReply: false,
    requiresArguments: true,
    telegramMenu: false,
    handlerIdentifier: 'handleImage',
  },

  // --- Медиа ---
  {
    id: 'save',
    command: 'save',
    title: 'Сохранить в архив',
    description: 'Принудительно сохранить ответное сообщение или медиа в персональный архив',
    category: 'media',
    usage: '/save (в ответ на сообщение)',
    example: '/save',
    enabled: true,
    requiresReply: true,
    requiresArguments: false,
    uiRoute: '/archive',
    telegramMenu: false,
    handlerIdentifier: 'handleSave',
  },
  {
    id: 'voice',
    command: 'гс',
    title: 'Голосовое сообщение',
    description: 'Информация о сохранении голосовых сообщений и аудиозаметок',
    category: 'media',
    usage: '/гс',
    example: '/гс',
    enabled: true,
    requiresReply: false,
    requiresArguments: false,
    uiRoute: '/archive?filter=voice',
    telegramMenu: false,
    handlerIdentifier: 'handleVoice',
  },

  // --- Развлекательные (с защитой от злоупотреблений и кулдауном) ---
  {
    id: 'fco',
    command: 'fco',
    title: 'Анимация текста',
    description: 'Генерация анимированной цитаты и текстового оформления',
    category: 'animations',
    usage: '/fco',
    example: '/fco',
    enabled: true,
    requiresReply: false,
    requiresArguments: false,
    telegramMenu: false,
    handlerIdentifier: 'handleFco',
  },
  {
    id: 'spam',
    command: 'spam',
    title: 'Проверка защиты от спама',
    description: 'Проверка политик безопасности и лимитов отправки сообщений',
    category: 'fun',
    usage: '/spam',
    example: '/spam',
    enabled: true,
    requiresReply: false,
    requiresArguments: false,
    telegramMenu: false,
    handlerIdentifier: 'handleSpam',
  },
  {
    id: 'troll',
    command: 'troll',
    title: 'Шуточный ответ',
    description: 'Шуточный ответ с дружеским розыгрышем (с кулдауном)',
    category: 'fun',
    usage: '/troll',
    example: '/troll',
    enabled: true,
    requiresReply: false,
    requiresArguments: false,
    telegramMenu: false,
    handlerIdentifier: 'handleTroll',
  },
  {
    id: 'a_troll',
    command: 'a_troll',
    title: 'Шуточный автоответчик',
    description: 'Статус шуточного автоответчика',
    category: 'fun',
    usage: '/a_troll',
    example: '/a_troll',
    enabled: true,
    requiresReply: false,
    requiresArguments: false,
    telegramMenu: false,
    handlerIdentifier: 'handleAutoTroll',
  },
];

/**
 * Get all registered commands.
 */
export function getAllCommands(): CommandDefinition[] {
  return COMMANDS_REGISTRY;
}

/**
 * Get enabled commands only.
 */
export function getEnabledCommands(): CommandDefinition[] {
  return COMMANDS_REGISTRY.filter((c) => c.enabled);
}

/**
 * Get commands intended for Telegram setMyCommands menu.
 */
export function getTelegramMenuCommands(): { command: string; description: string }[] {
  return COMMANDS_REGISTRY.filter((c) => c.telegramMenu && c.enabled).map((c) => ({
    command: c.command,
    description: c.description,
  }));
}

/**
 * Find command by its trigger word (case-insensitive, without leading slash).
 */
export function getCommand(name: string): CommandDefinition | undefined {
  const normalized = name.trim().toLowerCase().replace(/^\//, '');
  return COMMANDS_REGISTRY.find((c) => c.command.toLowerCase() === normalized);
}

/**
 * Get commands grouped by category.
 */
export function getCommandsByCategory(category: CommandCategory): CommandDefinition[] {
  return COMMANDS_REGISTRY.filter((c) => c.category === category);
}