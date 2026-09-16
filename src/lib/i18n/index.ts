// ============================================================
// SerkoGram — Unified Internationalization (i18n) Engine
// Supports: Russian (ru), Uzbek (uz), English (en)
// ============================================================

export type SupportedLanguage = 'ru' | 'uz' | 'en';

export const DEFAULT_LANGUAGE: SupportedLanguage = 'ru';

export const SUPPORTED_LANGUAGES: { code: SupportedLanguage; label: string; flag: string }[] = [
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'uz', label: 'O‘zbekcha', flag: '🇺🇿' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
];

export function resolveLanguage(code?: string | null): SupportedLanguage {
  if (!code) return DEFAULT_LANGUAGE;
  const lower = code.toLowerCase().slice(0, 2);
  if (lower === 'uz') return 'uz';
  if (lower === 'en') return 'en';
  return 'ru';
}

export const translations = {
  ru: {
    // Navigation
    'nav.home': 'Главная',
    'nav.archive': 'Архив',
    'nav.commands': 'Команды',
    'nav.faq': 'FAQ',
    'nav.support': 'Поддержка',
    'nav.settings': 'Настройки',
    'nav.connect': 'Подключение',
    'nav.instructions': 'Инструкции',

    // Connection Events
    'notify.accountConnected.title': '🟢 Аккаунт подключён',
    'notify.accountConnected.text': 'SerkoGram успешно подключён к вашему Telegram-аккаунту через Connected Business Bot.',
    'notify.accountDisconnected.title': '🔴 Аккаунт отключён',
    'notify.accountDisconnected.text': 'Интеграция SerkoGram была отключена или соединение с Telegram разорвано.',
    'notify.permissionChanged.title': '🟡 Права подключения изменены',
    'notify.permissionChanged.text': 'Разрешения бота в Telegram были обновлены. Проверьте права для продолжения работы.',
    'notify.messageEdited.title': '✏️ Сообщение изменено',
    'notify.messageEdited.text': 'В управляемом диалоге изменено сообщение.',
    'notify.messageDeleted.title': '🗑 Сообщение удалено',
    'notify.messageDeleted.text': 'В управляемом диалоге удалено сообщение.',
    'notify.messagesDeleted.title': '🗑 Сообщения удалены',
    'notify.messagesDeleted.text': 'В управляемом диалоге удалено {count} сообщений.',
    'notify.mediaSaved.title': '✅ Медиафайл сохранён',
    'notify.mediaSaved.text': 'Медиафайл успешно зафиксирован и сохранён в защищённом архиве.',
    'notify.ephemeralSaved.title': '🔥 Одноразовое медиа сохранено',
    'notify.ephemeralSaved.text': 'Одноразовое/исчезающее медиа сохранено в архиве до самоуничтожения.',
    'notify.timerCompleted.title': '⏰ Таймер завершён',
    'notify.timerCompleted.text': 'Время по вашему таймеру ({seconds} сек.) истекло.',
    'notify.automationError.title': '⚠️ Ошибка автоматизации',

    // Buttons
    'button.openArchive': '📁 Открыть в архиве',
    'button.openCommands': '📋 Каталог команд',
    'button.connect': '🔗 Подключить Telegram',
    'button.instructions': '📖 Инструкция',
    'button.faq': '❓ FAQ',
    'button.support': '💬 Поддержка',
    'button.unmute': '🔊 Размутить',
    'button.unpanic': '🟢 Снять режим паники',
    'button.back': 'Назад',
    'button.save': 'Сохранить',

    // Connection Status
    'status.connected': 'Подключено',
    'status.disconnected': 'Отключено',
    'status.needsAttention': 'Требуется внимание',
    'status.active': 'Активен',

    // Command Messages
    'cmd.save.hint': 'Команда .save используется в ответ на медиафайл (фото, видео, голосовые, документы или одноразовые медиа). Текстовые сообщения архивируются автоматически.',
    'cmd.save.noMedia': 'В ответном сообщении не обнаружено медиафайлов для сохранения. Команда .save предназначена для медиа.',
    'cmd.weather.unavailable': '⚠️ Сервис погоды временно недоступен или указанный город не найден.',
    'cmd.calc.usage': 'Использование: .calc 2 + 2 * 5',
    'cmd.calc.error': '❌ Некорректное математическое выражение.',
    'cmd.mute.activated': '🔇 <b>Режим Mute активирован</b> на {duration} сек.',
    'cmd.mute.unmuted': '🔊 <b>Режим Mute отключён</b>. Чат переведён в штатный режим.',
    'cmd.panic.activated': '🚨 <b>РЕЖИМ ПАНИКИ АКТИВИРОВАН</b>\nВсе входящие сообщения собеседника будут удаляться.',
    'cmd.panic.deactivated': '🟢 <b>Режим паники отключён</b>.',

    // Common
    'app.name': 'SerkoGram',
    'app.tagline': 'Telegram Automation & Private Message Archive',
    'common.chat': 'Чат',
    'common.type': 'Тип',
    'common.date': 'Дата',
    'common.loading': 'Загрузка...',
    'common.error': 'Произошла ошибка',
    'common.retry': 'Повторить',
    'common.close': 'Закрыть',
  },

  uz: {
    // Navigation
    'nav.home': 'Bosh sahifa',
    'nav.archive': 'Arxiv',
    'nav.commands': 'Buyruqlar',
    'nav.faq': 'FAQ',
    'nav.support': 'Qo‘llab-quvvatlash',
    'nav.settings': 'Sozlamalar',
    'nav.connect': 'Ulanish',
    'nav.instructions': 'Yo‘riqnoma',

    // Connection Events
    'notify.accountConnected.title': '🟢 Hisob ulandi',
    'notify.accountConnected.text': 'SerkoGram Connected Business Bot orqali Telegram hisobingizga muvaffaqiyatli ulandi.',
    'notify.accountDisconnected.title': '🔴 Hisob uzildi',
    'notify.accountDisconnected.text': 'SerkoGram integratsiyasi o‘chirildi yoki Telegram aloqasi uzildi.',
    'notify.permissionChanged.title': '🟡 Ruxsatlar o‘zgartirildi',
    'notify.permissionChanged.text': 'Telegramda bot ruxsatlari yangilandi. Davom etish uchun ruxsatlarni tekshiring.',
    'notify.messageEdited.title': '✏️ Xabar tahrirlandi',
    'notify.messageEdited.text': 'Boshqariladigan chatda xabar o‘zgartirildi.',
    'notify.messageDeleted.title': '🗑 Xabar o‘chirildi',
    'notify.messageDeleted.text': 'Boshqariladigan chatda xabar o‘chirildi.',
    'notify.messagesDeleted.title': '🗑 Xabarlar o‘chirildi',
    'notify.messagesDeleted.text': 'Boshqariladigan chatda {count} ta xabar o‘chirildi.',
    'notify.mediaSaved.title': '✅ Mediafayl saqlandi',
    'notify.mediaSaved.text': 'Mediafayl xavfsiz arxivga muvaffaqiyatli saqlandi.',
    'notify.ephemeralSaved.title': '🔥 Bir martalik media saqlandi',
    'notify.ephemeralSaved.text': 'Bir martalik/yo‘qoladigan media o‘chirilishidan oldin arxivga saqlandi.',
    'notify.timerCompleted.title': '⏰ Taymer tugadi',
    'notify.timerCompleted.text': 'Taymer bo‘yicha vaqt ({seconds} soniya) tugadi.',
    'notify.automationError.title': '⚠️ Avtomatlashtirish xatosi',

    // Buttons
    'button.openArchive': '📁 Arxivda ochish',
    'button.openCommands': '📋 Buyruqlar katalogi',
    'button.connect': '🔗 Telegramni ulash',
    'button.instructions': '📖 Yo‘riqnoma',
    'button.faq': '❓ FAQ',
    'button.support': '💬 Qo‘llab-quvvatlash',
    'button.unmute': '🔊 Ovozni yoqish',
    'button.unpanic': '🟢 Vahima rejimini o‘chirish',
    'button.back': 'Orqaga',
    'button.save': 'Saqlash',

    // Connection Status
    'status.connected': 'Ulangan',
    'status.disconnected': 'Uzilgan',
    'status.needsAttention': 'E’tibor talab qilinadi',
    'status.active': 'Faol',

    // Command Messages
    'cmd.save.hint': '.save buyrug‘i mediafayllarga (rasm, video, ovozli xabar yoki bir martalik media) javob tariqasida ishlatiladi. Matnli xabarlar avtomatik saqlanadi.',
    'cmd.save.noMedia': 'Javob berilgan xabarda saqlash uchun media topilmadi.',
    'cmd.weather.unavailable': '⚠️ Ob-havo xizmati vaqtincha ishlamayapti yoki shahar topilmadi.',
    'cmd.calc.usage': 'Foydalanish: .calc 2 + 2 * 5',
    'cmd.calc.error': '❌ Noto‘g‘ri matematik ifoda.',
    'cmd.mute.activated': '🔇 <b>Mute rejimi yoqildi</b> ({duration} soniya).',
    'cmd.mute.unmuted': '🔊 <b>Mute rejimi o‘chirildi</b>.',
    'cmd.panic.activated': '🚨 <b>VAHIMA REJIMI YOQILDI</b>\nBarcha kiruvchi xabarlar avtomatik o‘chiriladi.',
    'cmd.panic.deactivated': '🟢 <b>Vahima rejimi o‘chirildi</b>.',

    // Common
    'app.name': 'SerkoGram',
    'app.tagline': 'Telegram Automation & Private Message Archive',
    'common.chat': 'Chat',
    'common.type': 'Turi',
    'common.date': 'Sana',
    'common.loading': 'Yuklanmoqda...',
    'common.error': 'Xatolik yuz berdi',
    'common.retry': 'Qayta urinish',
    'common.close': 'Yopish',
  },

  en: {
    // Navigation
    'nav.home': 'Home',
    'nav.archive': 'Archive',
    'nav.commands': 'Commands',
    'nav.faq': 'FAQ',
    'nav.support': 'Support',
    'nav.settings': 'Settings',
    'nav.connect': 'Connection',
    'nav.instructions': 'Instructions',

    // Connection Events
    'notify.accountConnected.title': '🟢 Account Connected',
    'notify.accountConnected.text': 'SerkoGram connected to your Telegram account via Connected Business Bot.',
    'notify.accountDisconnected.title': '🔴 Account Disconnected',
    'notify.accountDisconnected.text': 'SerkoGram integration was disconnected or connection was lost.',
    'notify.permissionChanged.title': '🟡 Permissions Changed',
    'notify.permissionChanged.text': 'Bot permissions were updated in Telegram. Review rights to continue.',
    'notify.messageEdited.title': '✏️ Message Edited',
    'notify.messageEdited.text': 'A message was edited in a managed chat.',
    'notify.messageDeleted.title': '🗑 Message Deleted',
    'notify.messageDeleted.text': 'A message was deleted in a managed chat.',
    'notify.messagesDeleted.title': '🗑 Messages Deleted',
    'notify.messagesDeleted.text': '{count} messages were deleted in a managed chat.',
    'notify.mediaSaved.title': '✅ Media File Saved',
    'notify.mediaSaved.text': 'Media file captured and saved to secure archive.',
    'notify.ephemeralSaved.title': '🔥 View-Once Media Saved',
    'notify.ephemeralSaved.text': 'View-once / self-destructing media saved before expiration.',
    'notify.timerCompleted.title': '⏰ Timer Completed',
    'notify.timerCompleted.text': 'Your timer ({seconds} sec) has finished.',
    'notify.automationError.title': '⚠️ Automation Error',

    // Buttons
    'button.openArchive': '📁 Open Archive',
    'button.openCommands': '📋 Commands Catalog',
    'button.connect': '🔗 Connect Telegram',
    'button.instructions': '📖 Instructions',
    'button.faq': '❓ FAQ',
    'button.support': '💬 Support',
    'button.unmute': '🔊 Unmute',
    'button.unpanic': '🟢 Disable Panic Mode',
    'button.back': 'Back',
    'button.save': 'Save',

    // Connection Status
    'status.connected': 'Connected',
    'status.disconnected': 'Disconnected',
    'status.needsAttention': 'Needs Attention',
    'status.active': 'Active',

    // Command Messages
    'cmd.save.hint': 'Use .save in reply to a media file (photo, video, voice, document, or view-once media). Text messages are auto-archived.',
    'cmd.save.noMedia': 'No media found in replied message. .save is intended for media files.',
    'cmd.weather.unavailable': '⚠️ Weather service temporarily unavailable or city not found.',
    'cmd.calc.usage': 'Usage: .calc 2 + 2 * 5',
    'cmd.calc.error': '❌ Invalid mathematical expression.',
    'cmd.mute.activated': '🔇 <b>Mute mode active</b> for {duration} sec.',
    'cmd.mute.unmuted': '🔊 <b>Mute mode disabled</b>.',
    'cmd.panic.activated': '🚨 <b>PANIC MODE ACTIVATED</b>\nIncoming messages will be deleted automatically.',
    'cmd.panic.deactivated': '🟢 <b>Panic mode disabled</b>.',

    // Common
    'app.name': 'SerkoGram',
    'app.tagline': 'Telegram Automation & Private Message Archive',
    'common.chat': 'Chat',
    'common.type': 'Type',
    'common.date': 'Date',
    'common.loading': 'Loading...',
    'common.error': 'An error occurred',
    'common.retry': 'Retry',
    'common.close': 'Close',
  },
} as const;

export type TranslationKey = keyof typeof translations.ru;

/**
 * Universal translation function.
 * Supports string interpolation: t('notify.messagesDeleted.text', 'ru', { count: 5 })
 */
export function t(
  key: TranslationKey,
  lang: SupportedLanguage = DEFAULT_LANGUAGE,
  params?: Record<string, string | number>
): string {
  const dict = translations[lang] || translations[DEFAULT_LANGUAGE];
  let text = (dict as any)[key] || (translations[DEFAULT_LANGUAGE] as any)[key] || key;

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }

  return text;
}
