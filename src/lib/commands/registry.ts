// ============================================================
// SerkoGram — Unified Command Registry (Source of Truth)
// Covers both Dot Commands (.) and Slash Commands (/)
// ============================================================

export type CommandPrefix = '.' | '/' | '.|/';

export type CommandCategory =
  | 'main'
  | 'info'
  | 'archive'
  | 'games'
  | 'ai'
  | 'translation'
  | 'animations'
  | 'media'
  | 'fun'
  | 'mirror';

export type ResponseMode =
  | 'SAME_CHAT'
  | 'REPLY'
  | 'EDIT'
  | 'MINI_APP'
  | 'SILENT';

export interface CommandCategoryInfo {
  id: CommandCategory;
  name: string;
  description: string;
  icon: string;
}

export const COMMAND_CATEGORIES: CommandCategoryInfo[] = [
  { id: 'main', name: 'Основные', description: 'Базовые функции и навигация', icon: 'Sparkles' },
  { id: 'info', name: 'Информация', description: 'О сервисе, чате и собеседнике', icon: 'Info' },
  { id: 'archive', name: 'Архив', description: 'Сообщения, удалённые и медиа', icon: 'Archive' },
  { id: 'games', name: 'Игры', description: 'Интерактивные мини-игры', icon: 'Gamepad2' },
  { id: 'ai', name: 'Нейросеть', description: 'Искусственный интеллект и генерация', icon: 'Bot' },
  { id: 'translation', name: 'Перевод', description: 'Перевод сообщений в чате', icon: 'Languages' },
  { id: 'animations', name: 'Анимации', description: 'Анимированные текстовые эффекты', icon: 'Film' },
  { id: 'media', name: 'Медиа', description: 'Сохранение медиа и голосовых', icon: 'Image' },
  { id: 'fun', name: 'Приколы', description: 'Развлекательные команды', icon: 'Smile' },
  { id: 'mirror', name: 'Зеркала', description: 'Статусы и автоматизация', icon: 'Radio' },
];

export interface UnifiedCommandDefinition {
  id: string;
  name: string;
  prefix: CommandPrefix;
  title: string;
  description: string;
  category: CommandCategory;
  usage: string;
  example: string;
  enabled: boolean;
  disabledReason?: string;
  requiresReply: boolean;
  requiresArguments: boolean;
  requiresConnection: boolean;
  requiresAI: boolean;
  requiresMedia: boolean;
  requiredPermissions: string[];
  responseMode: ResponseMode;
  uiRoute?: string;
  telegramMenu: boolean;
  handlerIdentifier: string;
}

export function isAiProviderConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY);
}

export const UNIFIED_COMMANDS: UnifiedCommandDefinition[] = [
  // ============================================================
  // ОСНОВНЫЕ
  // ============================================================
  {
    id: 'start',
    name: 'start',
    prefix: '/',
    title: 'Старт',
    description: 'Главное меню и запуск приложения SerkoGram',
    category: 'main',
    usage: '/start [payload]',
    example: '/start',
    enabled: true,
    requiresReply: false,
    requiresArguments: false,
    requiresConnection: false,
    requiresAI: false,
    requiresMedia: false,
    requiredPermissions: [],
    responseMode: 'SAME_CHAT',
    uiRoute: '/',
    telegramMenu: true,
    handlerIdentifier: 'handleStart',
  },
  {
    id: 'help',
    name: 'help',
    prefix: '.|/',
    title: 'Помощь',
    description: 'Справочное руководство и список команд',
    category: 'main',
    usage: '.help или /help',
    example: '.help',
    enabled: true,
    requiresReply: false,
    requiresArguments: false,
    requiresConnection: false,
    requiresAI: false,
    requiresMedia: false,
    requiredPermissions: [],
    responseMode: 'SAME_CHAT',
    uiRoute: '/instructions',
    telegramMenu: true,
    handlerIdentifier: 'handleHelp',
  },
  {
    id: 'commands',
    name: 'commands',
    prefix: '.|/',
    title: 'Каталог команд',
    description: 'Полный интерактивный каталог всех команд SerkoGram',
    category: 'main',
    usage: '.commands или /commands',
    example: '.commands',
    enabled: true,
    requiresReply: false,
    requiresArguments: false,
    requiresConnection: false,
    requiresAI: false,
    requiresMedia: false,
    requiredPermissions: [],
    responseMode: 'SAME_CHAT',
    uiRoute: '/commands',
    telegramMenu: true,
    handlerIdentifier: 'handleCommands',
  },
  {
    id: 'settings',
    name: 'settings',
    prefix: '.|/',
    title: 'Настройки',
    description: 'Параметры архивации, автосохранение и приватность',
    category: 'main',
    usage: '.settings или /settings',
    example: '.settings',
    enabled: true,
    requiresReply: false,
    requiresArguments: false,
    requiresConnection: false,
    requiresAI: false,
    requiresMedia: false,
    requiredPermissions: [],
    responseMode: 'SAME_CHAT',
    uiRoute: '/settings',
    telegramMenu: true,
    handlerIdentifier: 'handleSettings',
  },

  // ============================================================
  // ИНФОРМАЦИЯ
  // ============================================================
  {
    id: 'info',
    name: 'info',
    prefix: '.|/',
    title: 'Информация',
    description: 'Сведения об авторе сообщения (по ответу) или о сервисе SerkoGram',
    category: 'info',
    usage: '.info (в ответ на сообщение) или /info',
    example: '.info',
    enabled: true,
    requiresReply: false,
    requiresArguments: false,
    requiresConnection: false,
    requiresAI: false,
    requiresMedia: false,
    requiredPermissions: [],
    responseMode: 'REPLY',
    uiRoute: '/faq',
    telegramMenu: true,
    handlerIdentifier: 'handleInfo',
  },

  // ============================================================
  // АРХИВ
  // ============================================================
  {
    id: 'archive',
    name: 'archive',
    prefix: '.|/',
    title: 'Архив переписки',
    description: 'Просмотр сохранённых чатов и сообщений текущего диалога',
    category: 'archive',
    usage: '.archive или /archive',
    example: '.archive',
    enabled: true,
    requiresReply: false,
    requiresArguments: false,
    requiresConnection: true,
    requiresAI: false,
    requiresMedia: false,
    requiredPermissions: ['read_messages'],
    responseMode: 'MINI_APP',
    uiRoute: '/archive',
    telegramMenu: true,
    handlerIdentifier: 'handleArchive',
  },
  {
    id: 'deleted',
    name: 'deleted',
    prefix: '.|/',
    title: 'Удалённые сообщения',
    description: 'Список удалённых сообщений в текущем чате или архиве',
    category: 'archive',
    usage: '.deleted или /deleted',
    example: '.deleted',
    enabled: true,
    requiresReply: false,
    requiresArguments: false,
    requiresConnection: true,
    requiresAI: false,
    requiresMedia: false,
    requiredPermissions: ['receive_deletions'],
    responseMode: 'MINI_APP',
    uiRoute: '/archive?filter=deleted',
    telegramMenu: true,
    handlerIdentifier: 'handleDeleted',
  },
  {
    id: 'media',
    name: 'media',
    prefix: '.|/',
    title: 'Медиатека',
    description: 'Просмотр сохранённых фото, видео, голосовых и документов',
    category: 'archive',
    usage: '.media или /media',
    example: '.media',
    enabled: true,
    requiresReply: false,
    requiresArguments: false,
    requiresConnection: true,
    requiresAI: false,
    requiresMedia: false,
    requiredPermissions: ['read_messages'],
    responseMode: 'MINI_APP',
    uiRoute: '/archive?filter=media',
    telegramMenu: true,
    handlerIdentifier: 'handleMedia',
  },
  {
    id: 'search',
    name: 'search',
    prefix: '.|/',
    title: 'Поиск по архиву',
    description: 'Полнотекстовый поиск по переписке текущего чата',
    category: 'archive',
    usage: '.search <запрос> или /search <запрос>',
    example: '.search договор',
    enabled: true,
    requiresReply: false,
    requiresArguments: true,
    requiresConnection: true,
    requiresAI: false,
    requiresMedia: false,
    requiredPermissions: ['read_messages'],
    responseMode: 'SAME_CHAT',
    uiRoute: '/archive?search=true',
    telegramMenu: true,
    handlerIdentifier: 'handleSearch',
  },

  // ============================================================
  // ИГРЫ
  // ============================================================
  {
    id: 'coin',
    name: 'coin',
    prefix: '.|/',
    title: 'Монетка',
    description: 'Бросок монетки: Орёл или Решка в текущий чат',
    category: 'games',
    usage: '.coin или /coin',
    example: '.coin',
    enabled: true,
    requiresReply: false,
    requiresArguments: false,
    requiresConnection: false,
    requiresAI: false,
    requiresMedia: false,
    requiredPermissions: [],
    responseMode: 'SAME_CHAT',
    telegramMenu: false,
    handlerIdentifier: 'handleCoin',
  },
  {
    id: 'ttt',
    name: 'ttt',
    prefix: '.|/',
    title: 'Крестики-нолики',
    description: 'Интерактивная игра в крестики-нолики',
    category: 'games',
    usage: '.ttt или /ttt',
    example: '.ttt',
    enabled: true,
    requiresReply: false,
    requiresArguments: false,
    requiresConnection: false,
    requiresAI: false,
    requiresMedia: false,
    requiredPermissions: [],
    responseMode: 'SAME_CHAT',
    telegramMenu: false,
    handlerIdentifier: 'handleTicTacToe',
  },
  {
    id: 'rps',
    name: 'rps',
    prefix: '.|/',
    title: 'Камень-Ножницы-Бумага',
    description: 'Классическая игра против бота или собеседника',
    category: 'games',
    usage: '.rps [камень|ножницы|бумага]',
    example: '.rps камень',
    enabled: true,
    requiresReply: false,
    requiresArguments: false,
    requiresConnection: false,
    requiresAI: false,
    requiresMedia: false,
    requiredPermissions: [],
    responseMode: 'SAME_CHAT',
    telegramMenu: false,
    handlerIdentifier: 'handleRps',
  },

  // ============================================================
  // НЕЙРОСЕТЬ (AI)
  // ============================================================
  {
    id: 'gpt',
    name: 'gpt',
    prefix: '.|/',
    title: 'Запрос к AI',
    description: 'Задать вопрос нейросети прямо в чате',
    category: 'ai',
    usage: '.gpt <вопрос>',
    example: '.gpt Напиши короткий план встречи',
    enabled: false,
    disabledReason: 'Требуется подключение AI-провайдера (OPENAI_API_KEY)',
    requiresReply: false,
    requiresArguments: true,
    requiresConnection: false,
    requiresAI: true,
    requiresMedia: false,
    requiredPermissions: [],
    responseMode: 'SAME_CHAT',
    telegramMenu: false,
    handlerIdentifier: 'handleGpt',
  },
  {
    id: 'a_gpt',
    name: 'a_gpt',
    prefix: '.|/',
    title: 'Авто-AI ответчик',
    description: 'Включить автоматические AI-ответы в выбранном чате',
    category: 'ai',
    usage: '.a_gpt',
    example: '.a_gpt',
    enabled: false,
    disabledReason: 'Требуется подключение AI-провайдера (OPENAI_API_KEY)',
    requiresReply: false,
    requiresArguments: false,
    requiresConnection: true,
    requiresAI: true,
    requiresMedia: false,
    requiredPermissions: ['can_reply'],
    responseMode: 'SAME_CHAT',
    telegramMenu: false,
    handlerIdentifier: 'handleAutoGpt',
  },
  {
    id: 'a_gpt_off',
    name: 'a_gpt_off',
    prefix: '.|/',
    title: 'Отключить Авто-AI',
    description: 'Отключить автоматические AI-ответы в чате',
    category: 'ai',
    usage: '.a_gpt_off',
    example: '.a_gpt_off',
    enabled: false,
    disabledReason: 'Требуется подключение AI-провайдера (OPENAI_API_KEY)',
    requiresReply: false,
    requiresArguments: false,
    requiresConnection: true,
    requiresAI: true,
    requiresMedia: false,
    requiredPermissions: ['can_reply'],
    responseMode: 'SAME_CHAT',
    telegramMenu: false,
    handlerIdentifier: 'handleAutoGptOff',
  },
  {
    id: 'image',
    name: 'image',
    prefix: '.|/',
    title: 'Генерация картинок',
    description: 'Создание изображения по текстовому описанию',
    category: 'ai',
    usage: '.image <описание>',
    example: '.image Неоновый город под дождём',
    enabled: false,
    disabledReason: 'Требуется подключение AI-провайдера (OPENAI_API_KEY)',
    requiresReply: false,
    requiresArguments: true,
    requiresConnection: false,
    requiresAI: true,
    requiresMedia: false,
    requiredPermissions: [],
    responseMode: 'SAME_CHAT',
    telegramMenu: false,
    handlerIdentifier: 'handleImage',
  },

  // ============================================================
  // ПЕРЕВОД (TRANSLATION)
  // ============================================================
  {
    id: 'translate',
    name: 'перевод',
    prefix: '.',
    title: 'Перевод сообщений',
    description: 'Включить автоматический перевод сообщений в текущем чате (en, ru, de, etc.) или отключить (off)',
    category: 'translation',
    usage: '.перевод [код_языка|off]',
    example: '.перевод en',
    enabled: true,
    requiresReply: false,
    requiresArguments: true,
    requiresConnection: true,
    requiresAI: false,
    requiresMedia: false,
    requiredPermissions: ['can_reply'],
    responseMode: 'SAME_CHAT',
    telegramMenu: false,
    handlerIdentifier: 'handleTranslation',
  },

  // ============================================================
  // АНИМАЦИИ
  // ============================================================
  {
    id: 'fco',
    name: 'fco',
    prefix: '.|/',
    title: 'Анимация текста',
    description: 'Генерация анимированной цитаты и текстового оформления',
    category: 'animations',
    usage: '.fco или /fco',
    example: '.fco',
    enabled: true,
    requiresReply: false,
    requiresArguments: false,
    requiresConnection: false,
    requiresAI: false,
    requiresMedia: false,
    requiredPermissions: [],
    responseMode: 'SAME_CHAT',
    telegramMenu: false,
    handlerIdentifier: 'handleFco',
  },

  // ============================================================
  // МЕДИА & EPHEMERAL MEDIA
  // ============================================================
  {
    id: 'save',
    name: 'save',
    prefix: '.|/',
    title: 'Сохранить в архив',
    description: 'Принудительно сохранить ответное медиа (включая одноразовое / исчезающее фото или видео) в защищённый архив',
    category: 'media',
    usage: '.save (в ответ на медиа/сообщение) или .save <URL>',
    example: '.save',
    enabled: true,
    requiresReply: true,
    requiresArguments: false,
    requiresConnection: true,
    requiresAI: false,
    requiresMedia: true,
    requiredPermissions: ['read_messages'],
    responseMode: 'REPLY',
    uiRoute: '/archive',
    telegramMenu: false,
    handlerIdentifier: 'handleSave',
  },
  {
    id: 'voice',
    name: 'гс',
    prefix: '.|/',
    title: 'Голосовые заметки',
    description: 'Расшифровка или фиксация голосового сообщения (в ответ на аудио/voice)',
    category: 'media',
    usage: '.гс (в ответ на аудио)',
    example: '.гс',
    enabled: true,
    requiresReply: true,
    requiresArguments: false,
    requiresConnection: true,
    requiresAI: false,
    requiresMedia: true,
    requiredPermissions: ['read_messages'],
    responseMode: 'REPLY',
    uiRoute: '/archive?filter=voice',
    telegramMenu: false,
    handlerIdentifier: 'handleVoice',
  },

  // ============================================================
  // ПРИКОЛЫ & РАЗВЛЕЧЕНИЯ (С ОГРАНИЧЕНИЯМИ)
  // ============================================================
  {
    id: 'spam',
    name: 'spam',
    prefix: '.|/',
    title: 'Защита от спама',
    description: 'Тест системы защиты от флуда и ограничений Telegram',
    category: 'fun',
    usage: '.spam [кол-во до 3]',
    example: '.spam 3',
    enabled: true,
    requiresReply: false,
    requiresArguments: false,
    requiresConnection: false,
    requiresAI: false,
    requiresMedia: false,
    requiredPermissions: [],
    responseMode: 'SAME_CHAT',
    telegramMenu: false,
    handlerIdentifier: 'handleSpam',
  },
  {
    id: 'troll',
    name: 'troll',
    prefix: '.|/',
    title: 'Шуточный ответ',
    description: 'Безобидный шуточный ответ с системным кулдауном',
    category: 'fun',
    usage: '.troll',
    example: '.troll',
    enabled: true,
    requiresReply: false,
    requiresArguments: false,
    requiresConnection: false,
    requiresAI: false,
    requiresMedia: false,
    requiredPermissions: [],
    responseMode: 'SAME_CHAT',
    telegramMenu: false,
    handlerIdentifier: 'handleTroll',
  },
  {
    id: 'a_troll',
    name: 'a_troll',
    prefix: '.|/',
    title: 'Шуточный автоответчик',
    description: 'Статус шуточного автоответчика с лимитом срабатываний',
    category: 'fun',
    usage: '.a_troll',
    example: '.a_troll',
    enabled: true,
    requiresReply: false,
    requiresArguments: false,
    requiresConnection: false,
    requiresAI: false,
    requiresMedia: false,
    requiredPermissions: [],
    responseMode: 'SAME_CHAT',
    telegramMenu: false,
    handlerIdentifier: 'handleAutoTroll',
  },

  // ============================================================
  // ЗЕРКАЛА / АВТОМАТИЗАЦИЯ
  // ============================================================
  {
    id: 'online',
    name: 'online',
    prefix: '.',
    title: 'Вечный онлайн',
    description: 'Статус режима удержания онлайн (доступность зависит от прав клиента)',
    category: 'mirror',
    usage: '.online',
    example: '.online',
    enabled: false,
    disabledReason: 'Функция требует прямого MTProto-подключения клиента',
    requiresReply: false,
    requiresArguments: false,
    requiresConnection: true,
    requiresAI: false,
    requiresMedia: false,
    requiredPermissions: [],
    responseMode: 'SAME_CHAT',
    telegramMenu: false,
    handlerIdentifier: 'handleOnline',
  },
  {
    id: 'autotyping',
    name: 'autotyping',
    prefix: '.',
    title: 'Авто-печатание',
    description: 'Индикация статуса набора текста в активном диалоге',
    category: 'mirror',
    usage: '.autotyping [on|off]',
    example: '.autotyping on',
    enabled: false,
    disabledReason: 'Функция требует прямого MTProto-подключения клиента',
    requiresReply: false,
    requiresArguments: false,
    requiresConnection: true,
    requiresAI: false,
    requiresMedia: false,
    requiredPermissions: [],
    responseMode: 'SAME_CHAT',
    telegramMenu: false,
    handlerIdentifier: 'handleAutoTyping',
  },
  {
    id: 'autovoice',
    name: 'autovoice',
    prefix: '.',
    title: 'Авто-запись голоса',
    description: 'Индикация статуса записи аудио в диалоге',
    category: 'mirror',
    usage: '.autovoice [on|off]',
    example: '.autovoice on',
    enabled: false,
    disabledReason: 'Функция требует прямого MTProto-подключения клиента',
    requiresReply: false,
    requiresArguments: false,
    requiresConnection: true,
    requiresAI: false,
    requiresMedia: false,
    requiredPermissions: [],
    responseMode: 'SAME_CHAT',
    telegramMenu: false,
    handlerIdentifier: 'handleAutoVoice',
  },
];

export function getAllCommands(): UnifiedCommandDefinition[] {
  return UNIFIED_COMMANDS;
}

export function getDotCommands(): UnifiedCommandDefinition[] {
  return UNIFIED_COMMANDS.filter((c) => c.prefix.includes('.'));
}

export function getSlashCommands(): UnifiedCommandDefinition[] {
  return UNIFIED_COMMANDS.filter((c) => c.prefix.includes('/'));
}

export function getTelegramMenuCommands(): { command: string; description: string }[] {
  return UNIFIED_COMMANDS.filter((c) => c.telegramMenu && c.enabled).map((c) => ({
    command: c.name,
    description: c.description,
  }));
}

export function getCommandByName(name: string, prefix?: '.' | '/'): UnifiedCommandDefinition | undefined {
  const normalized = name.trim().toLowerCase().replace(/^[./]/, '');
  return UNIFIED_COMMANDS.find((c) => {
    const nameMatches = c.name.toLowerCase() === normalized;
    if (!nameMatches) return false;
    if (prefix && !c.prefix.includes(prefix)) return false;
    return true;
  });
}

export function getCommandsByCategory(category: CommandCategory): UnifiedCommandDefinition[] {
  return UNIFIED_COMMANDS.filter((c) => c.category === category);
}