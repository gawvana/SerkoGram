# SerkoGram

Персональный архив сообщений Telegram с отслеживанием удалённых и изменённых сообщений.

![SerkoGram](https://img.shields.io/badge/SerkoGram-v1.0.0-8b5cf6)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## О проекте

SerkoGram — это Telegram Mini App, которое работает как персональный архив сообщений. Подключаясь через Telegram Business API, SerkoGram автоматически сохраняет все входящие и исходящие сообщения, отслеживает удаления и изменения, хранит медиафайлы и предоставляет удобный поиск по истории.

### Ключевые возможности

- 📨 **Автоматическое сохранение** — все сообщения сохраняются автоматически
- 🗑 **Удалённые сообщения** — восстановление ранее сохранённых удалённых сообщений
- ✏️ **История изменений** — полная история редактирования сообщений
- 📷 **Медиафайлы** — фото, видео, документы, голосовые сообщения
- 🔍 **Быстрый поиск** — полнотекстовый поиск по всему архиву
- 🔒 **Безопасность** — данные доступны только владельцу аккаунта
- 📱 **Telegram-like UI** — привычный интерфейс в стиле Telegram

## Архитектура

```
┌─────────────────────────────────────────────────┐
│                 Telegram Client                  │
│          (Mini App / Bot Commands)               │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│              Vercel Platform                     │
│                                                  │
│  ┌──────────────┐  ┌──────────────────────────┐ │
│  │  Next.js App  │  │  API Routes (Node.js)    │ │
│  │  (React 19)   │  │  • REST API              │ │
│  │  (Tailwind)   │  │  • Telegram Webhook      │ │
│  │  (TanStack)   │  │  • Auth                  │ │
│  └──────────────┘  └────────────┬─────────────┘ │
│                                  │               │
└──────────────────────────────────┼───────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
              ┌─────▼─────┐ ┌─────▼─────┐       │
              │ PostgreSQL │ │Vercel Blob│       │
              │   (Neon)   │ │ (Storage) │       │
              └───────────┘ └───────────┘       │
```

### Технологии

| Компонент | Технология |
|-----------|-----------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS |
| State | TanStack React Query |
| Bot | Grammy (Telegram Bot Framework) |
| Database | PostgreSQL через Prisma ORM |
| Storage | Vercel Blob |
| Validation | Zod |
| Icons | Lucide React |
| Deploy | Vercel |
| Tests | Vitest |

## Локальная разработка

### Требования

- Node.js 20+
- npm или pnpm
- PostgreSQL (локально или Neon/Supabase)

### Установка

```bash
# Клонировать репозиторий
git clone https://github.com/YOUR_USERNAME/SerkoGram.git
cd SerkoGram

# Установить зависимости
npm install

# Скопировать и заполнить переменные окружения
cp .env.example .env
# Отредактируйте .env и заполните все значения

# Сгенерировать Prisma Client
npm run db:generate

# Применить схему к базе данных
npm run db:push

# Запустить dev-сервер
npm run dev
```

### Переменные окружения

| Переменная | Описание |
|-----------|----------|
| `TELEGRAM_BOT_TOKEN` | Токен бота от @BotFather |
| `TELEGRAM_BOT_USERNAME` | Username бота без @ |
| `TELEGRAM_WEBHOOK_SECRET` | Секретный токен для webhook |
| `DATABASE_URL` | Pooled PostgreSQL URL |
| `DIRECT_URL` | Direct PostgreSQL URL (для миграций) |
| `NEXT_PUBLIC_APP_URL` | URL приложения (Vercel URL) |
| `SESSION_SECRET` | Секрет для подписи сессий (мин. 32 символа) |
| `BLOB_READ_WRITE_TOKEN` | Токен Vercel Blob |
| `ADMIN_TELEGRAM_ID` | Telegram ID администратора |

## Настройка Telegram бота

1. Создайте бота через [@BotFather](https://t.me/BotFather)
2. Получите `BOT_TOKEN`
3. Установите команды бота:
   ```
   start - Главное меню
   help - Список команд
   info - О SerkoGram
   archive - Открыть архив
   deleted - Удалённые сообщения
   media - Медиафайлы
   search - Поиск
   settings - Настройки
   ```
4. Через BotFather → Bot Settings → Menu Button → настройте Web App URL

## Подключение Telegram Business

1. Пользователь открывает Telegram → Настройки → Telegram Business → Чат-боты
2. Выбирает бота SerkoGram
3. Настраивает, какие чаты подключить и какие права дать
4. Бот получает `business_connection` update и начинает архивацию

## Database

Схема включает таблицы:
- `users` — пользователи
- `business_connections` — подключения Telegram Business
- `chats` — чаты
- `chat_members` — участники чатов
- `messages` — сообщения
- `message_versions` — история редактирования
- `message_media` — медиафайлы
- `message_deletions` — записи об удалении
- `user_settings` — настройки пользователя
- `privacy_settings` — настройки приватности
- `support_tickets` — тикеты поддержки
- `support_messages` — сообщения в тикетах
- `audit_logs` — журнал аудита
- `processed_updates` — обработанные Telegram обновления

## Деплой на Vercel

1. Push в GitHub
2. Подключите репозиторий к Vercel
3. Добавьте все переменные окружения в Vercel Dashboard
4. Deploy

### Настройка webhook

После деплоя установите webhook:

```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://YOUR_APP.vercel.app/api/telegram/webhook&secret_token=YOUR_SECRET&allowed_updates=[\"business_connection\",\"business_message\",\"edited_business_message\",\"deleted_business_messages\",\"message\",\"callback_query\"]"
```

Проверка webhook:
```bash
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

## Тестирование

```bash
npm run test          # Запустить тесты
npm run test:watch    # Тесты в watch-режиме
npm run typecheck     # Проверка типов
npm run lint          # ESLint
npm run build         # Production build
```

## Безопасность

- Все секреты только через переменные окружения
- HMAC-SHA256 валидация Telegram initData
- Подписанные cookie-сессии
- Защита от IDOR (все запросы фильтруются по пользователю)
- Rate limiting
- Zod-валидация всех входных данных
- Security headers (XSS, Content-Type, Frame-Options)
- Защищённый доступ к медиафайлам

## Лицензия

MIT License — см. [LICENSE](LICENSE)
