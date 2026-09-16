# SerkoGram 2.0 — Command Reference

## Summary

| Status | Count | Description |
|--------|-------|-------------|
| WORKING | 60 | Real Telegram API call or text transformation |
| DISABLED | 12 | Requires external service (AI, FFmpeg, MTProto) |
| **Total** | **72** | Across 12 categories |

**Banned (not counted):** `.dox`, `.deanon`, `.osint` — permanently blocked at registry and executor level.

---

## Commands by Category

### Main (4)

| Command | Prefix | Status | Description |
|---------|--------|--------|-------------|
| `help` | `.\|/` | WORKING | Справка по всем командам SerkoGram |
| `start` | `.\|/` | WORKING | Приветствие и инициализация бота |
| `commands` | `.\|/` | WORKING | Открыть Command Center в Mini App |
| `menu` | `.\|/` | WORKING | Открыть мини-приложение SerkoGram |

### Info (2)

| Command | Prefix | Status | Description |
|---------|--------|--------|-------------|
| `info` | `.\|/` | WORKING | Информация о чате и собеседнике |
| `profile` | `.\|/` | WORKING | Профиль пользователя SerkoGram |

### Archive (4)

| Command | Prefix | Status | Description |
|---------|--------|--------|-------------|
| `archive` | `.\|/` | WORKING | Открыть архив текущего чата |
| `deleted` | `.\|/` | WORKING | Показать удалённые сообщения |
| `media` | `.\|/` | WORKING | Показать медиафайлы чата |
| `search` | `.\|/` | WORKING | Поиск по архиву сообщений |

### Games (5)

| Command | Prefix | Status | Description |
|---------|--------|--------|-------------|
| `coin` | `.` | WORKING | Подбросить монетку (орёл/решка) |
| `dice` | `.` | WORKING | Бросить кубик (1-6) |
| `ttt` | `.\|/` | WORKING | Крестики-нолики (inline keyboard) |
| `rps` | `.\|/` | WORKING | Камень-ножницы-бумага |
| `slot` | `.` | WORKING | Игровой автомат |

### AI (6)

| Command | Prefix | Status | Description |
|---------|--------|--------|-------------|
| `gpt` | `.\|/` | DISABLED | Задать вопрос нейросети. *Requires OPENAI_API_KEY* |
| `a_gpt` | `.\|/` | DISABLED | Включить авто AI-ответы. *Requires OPENAI_API_KEY* |
| `a_gpt_off` | `.\|/` | DISABLED | Отключить авто AI-ответы. *Requires OPENAI_API_KEY* |
| `image` | `.\|/` | DISABLED | Генерация изображения. *Requires OPENAI_API_KEY* |
| `fix` | `.` | WORKING | Исправление грамматики (regex-based) |
| `stt` | `.` | DISABLED | Расшифровка голосового. *Requires Whisper/STT API* |

### Translation (2)

| Command | Prefix | Status | Description |
|---------|--------|--------|-------------|
| `перевод` | `.` | WORKING | Автоперевод сообщений (MyMemory API) |
| `tr` | `.` | WORKING | Перевод текста на указанный язык |

### Animations (8)

| Command | Prefix | Status | Description |
|---------|--------|--------|-------------|
| `fco` | `.\|/` | WORKING | Анимированная цитата |
| `p` | `.\|/` | WORKING | Пиксельный баннер SerkoGram |
| `love` | `.` | WORKING | Сердечное признание |
| `love2` | `.` | WORKING | Радужная анимация сердец |
| `-7` | `.` | WORKING | Обратный отсчёт Tokyo Ghoul |
| `heart` | `.` | WORKING | Текст с сердечками |
| `plove` | `.` | WORKING | Пиксельный кролик |
| `nospace` | `.` | WORKING | Удаление пробелов |

### Fun (18)

| Command | Prefix | Status | Description |
|---------|--------|--------|-------------|
| `flip` | `.` | WORKING | Переворот текста вверх ногами |
| `bubble` | `.` | WORKING | Текст в кружках |
| `dumb` | `.` | WORKING | Чередование прописных/строчных |
| `leet` | `.` | WORKING | Leetspeak стиль |
| `zalgo` | `.` | WORKING | Диакритический хаос |
| `spam` | `.\|/` | WORKING | Тест защиты от флуда |
| `troll` | `.\|/` | WORKING | Шуточный ответ |
| `a_troll` | `.\|/` | WORKING | Статус шуточного автоответчика |
| `trol` | `.` | WORKING | Алиас .troll |
| `tyuring` | `.` | WORKING | Шуточный диалог |
| `fake` | `.` | WORKING | Стилизованная цитата |
| `pet` | `.` | WORKING | Тёплая реакция |
| `wanted` | `.` | WORKING | Постер "Разыскивается" |
| `agro` | `.` | WORKING | Шуточный дерзкий ответ |
| `shrug` | `.` | WORKING | ¯\\\_(ツ)\_/¯ |
| `tableflip` | `.` | WORKING | (╯°□°)╯︵ ┻━┻ |
| `unflip` | `.` | WORKING | ┬─┬ノ( º \_ ºノ) |
| `quote` | `.` | WORKING | Мотивирующая цитата дня |

### Utility (12)

| Command | Prefix | Status | Description |
|---------|--------|--------|-------------|
| `spoiler` | `.` | WORKING | Скрытый текст спойлера |
| `warn` | `.` | WORKING | Предупреждение участнику (DB-persisted) |
| `mute` | `.` | WORKING | Ограничение сообщений (DB state machine) |
| `unmute` | `.` | WORKING | Снятие ограничений |
| `panic` | `.` | WORKING | Экстренный режим защиты (DB state machine) |
| `unpanic` | `.` | WORKING | Возврат в нормальный режим |
| `snos` | `.` | WORKING | Удаление архива |
| `clone` | `.` | DISABLED | Дублирование сообщения. *Not supported by Bot API* |
| `calc` | `.` | WORKING | Математические вычисления |
| `ping` | `.` | WORKING | Проверка отклика бота |
| `weather` | `.` | WORKING | Прогноз погоды |
| `status` | `.` | WORKING | Статус автоматизации |

### Media (6)

| Command | Prefix | Status | Description |
|---------|--------|--------|-------------|
| `save` | `.\|/` | WORKING | Сохранить медиа в архив (DB + Blob) |
| `гс` | `.\|/` | DISABLED | Расшифровка голосового. *Requires audio processing* |
| `vnote` | `.` | DISABLED | Конвертация в видеокружок. *Requires FFmpeg* |
| `vreverse` | `.` | DISABLED | Реверс видео. *Requires FFmpeg* |
| `dem` | `.` | WORKING | Генерация демотиватора |
| `art` | `.` | WORKING | ASCII/Braille текстовый баннер |

### Mirror (3)

| Command | Prefix | Status | Description |
|---------|--------|--------|-------------|
| `online` | `.` | DISABLED | Режим "всегда онлайн". *Requires MTProto/TDLib* |
| `autotyping` | `.` | DISABLED | Индикация набора текста. *Requires MTProto/TDLib* |
| `autovoice` | `.` | DISABLED | Индикация записи аудио. *Requires MTProto/TDLib* |

### Automation (2)

| Command | Prefix | Status | Description |
|---------|--------|--------|-------------|
| `timer` | `.` | WORKING | Таймер-напоминание (≤55s serverless limit, DB-durable for longer) |
| `typing` | `.` | WORKING | Отправка индикатора набора текста |
