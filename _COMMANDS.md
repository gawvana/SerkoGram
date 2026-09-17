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

### Translation (2)

| Command | Prefix | Status | Description |
|---------|--------|--------|-------------|
| `перевод` | `.` | WORKING | Автоперевод сообщений (MyMemory API) |
| `tr` | `.` | WORKING | Перевод текста на указанный язык |

### Fun (16)

| Command | Prefix | Status | Description |
|---------|--------|--------|-------------|
| `fco` | `.` | WORKING | Случайная цитата и оформление |
| `nospace` | `.` | WORKING | Удаление пробелов из текста |
| `flip` | `.` | WORKING | Переворот текста вверх ногами |
| `bubble` | `.` | WORKING | Текст в кружках |
| `dumb` | `.` | WORKING | Чередование прописных/строчных |
| `leet` | `.` | WORKING | Leetspeak стиль |
| `zalgo` | `.` | WORKING | Текст с искажениями Zalgo |
| `translit` | `.` | WORKING | Транслитерация ru ↔ en |
| `troll` | `.` | WORKING | Шуточный ответ |
| `a_troll` | `.` | WORKING | Авто-троллинг статус |
| `tyuring` | `.` | WORKING | Шуточный тест Тьюринга |
| `spam` | `.` | WORKING | Защита от флуда и спама |
| `fake` | `.` | WORKING | Имитация системного уведомления |
| `pet` | `.` | WORKING | Текстовый питомец |
| `wanted` | `.` | WORKING | Текстовый постер розыска |
| `agro` | `.` | WORKING | Шуточный дерзкий ответ |
| `shrug` | `.` | WORKING | ¯\\\_(ツ)\_/¯ |
| `tableflip` | `.` | WORKING | (╯°□°)╯︵ ┻━┻ |
| `unflip` | `.` | WORKING | ┬─┬ノ( º \_ ºノ) |
| `quote` | `.` | WORKING | Мотивирующая цитата дня |

### Utility (14)

| Command | Prefix | Status | Description |
|---------|--------|--------|-------------|
| `fix` | `.` | WORKING | Корректор текста (исправление пунктуации и регистра) |
| `stt` | `.` | DISABLED | Расшифровка голосового. *Requires Whisper/STT API* |
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
