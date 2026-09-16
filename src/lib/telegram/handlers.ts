// ============================================================
// SerkoGram — Bot Command Handlers
// ============================================================

import { getBot } from './bot';
import { COMMANDS_REGISTRY, isAiProviderConfigured } from './commands';
import { renderTttKeyboard, handleRpsGame } from './games';
import type { ParsedCommand } from './parser';
import type { Message as TgMessage, Update } from 'grammy/types';

// Simple in-memory cooldown tracker for fun commands
const cooldowns = new Map<string, number>();

function checkCooldown(userId: number, command: string, seconds: number): boolean {
  const key = `${userId}:${command}`;
  const now = Date.now();
  const expiresAt = cooldowns.get(key) ?? 0;
  if (now < expiresAt) return false;
  cooldowns.set(key, now + seconds * 1000);
  return true;
}

export async function executeCommand(msg: TgMessage, parsed: ParsedCommand): Promise<void> {
  const bot = getBot();
  const chatId = msg.chat.id;
  const userId = msg.from?.id ?? 0;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';

  try {
    switch (parsed.command) {
    case 'start': {
      const keyboard: any[] = [];
      if (appUrl) {
        keyboard.push([{ text: '📱 Открыть SerkoGram', web_app: { url: appUrl } }]);
      }
      keyboard.push(
        [{ text: '🔗 Подключить Telegram', callback_data: 'connect' }],
        [{ text: '📋 Каталог команд', callback_data: 'commands' }],
        [{ text: '📖 Инструкция', callback_data: 'instructions' }],
        [{ text: '❓ FAQ', callback_data: 'faq' }],
        [{ text: '💬 Поддержка', callback_data: 'support' }]
      );

      await bot.api.sendMessage(
        chatId,
        `🟢 <b>SerkoGram</b>\n\n` +
          `Добро пожаловать!\n\n` +
          `Персональный архив Telegram-сообщений, медиа и истории изменений доступных подключённых чатов.\n\n` +
          `• Автоматическое сохранение сообщений\n` +
          `• Архив удалённых и изменённых сообщений\n` +
          `• Защищённое хранение медиафайлов\n` +
          `• Быстрый поиск по переписке`,
        {
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: keyboard },
        }
      );
      break;
    }

    case 'help': {
      const keyboard: any[] = [];
      if (appUrl) {
        keyboard.push([{ text: '📱 Открыть все команды', web_app: { url: `${appUrl}/commands` } }]);
      }

      await bot.api.sendMessage(
        chatId,
        `📋 <b>Команды SerkoGram</b>\n\n` +
          `/start — Главное меню\n` +
          `/help — Справка и помощь\n` +
          `/commands — Полный каталог команд\n` +
          `/archive — Открыть архив сообщений\n` +
          `/deleted — Удалённые сообщения\n` +
          `/media — Медиафайлы и документы\n` +
          `/search — Поиск по переписке\n` +
          `/coin — Бросок монетки\n` +
          `/rps — Камень, ножницы, бумага\n` +
          `/settings — Параметры и приватность`,
        {
          parse_mode: 'HTML',
          reply_markup: keyboard.length > 0 ? { inline_keyboard: keyboard } : undefined,
        }
      );
      break;
    }

    case 'commands': {
      const keyboard: any[] = [];
      if (appUrl) {
        keyboard.push([{ text: '📱 Открыть каталог команд', web_app: { url: `${appUrl}/commands` } }]);
      }

      await bot.api.sendMessage(
        chatId,
        `📋 <b>Каталог команд SerkoGram</b>\n\n` +
          `Используйте интерактивный каталог в Mini App для просмотра всех возможностей, параметров и примеров использования:`,
        {
          parse_mode: 'HTML',
          reply_markup: keyboard.length > 0 ? { inline_keyboard: keyboard } : undefined,
        }
      );
      break;
    }

    case 'info': {
      await bot.api.sendMessage(
        chatId,
        `🟢 <b>О сервисе SerkoGram</b>\n\n` +
          `Безопасная экосистема для сохранения и организации истории сообщений.\n\n` +
          `• <b>Подключение</b>: Официальное подключение через Telegram Business\n` +
          `• <b>Приватность</b>: Ваши сообщения и медиа доступны только вам\n` +
          `• <b>Удалённые</b>: Фиксация сообщений, удалённых собеседником после подключения\n` +
          `• <b>Версии</b>: Полная история правок и исправлений сообщений`,
        { parse_mode: 'HTML' }
      );
      break;
    }

    case 'archive':
    case 'deleted':
    case 'media':
    case 'settings': {
      const routes: Record<string, { route: string; title: string }> = {
        archive: { route: '/archive', title: '📁 Открыть архив' },
        deleted: { route: '/archive?filter=deleted', title: '🗑 Удалённые сообщения' },
        media: { route: '/archive?filter=media', title: '📷 Медиатека архива' },
        settings: { route: '/settings', title: '⚙️ Настройки' },
      };

      const target = routes[parsed.command];
      if (appUrl) {
        await bot.api.sendMessage(chatId, `📱 Откройте раздел в SerkoGram Mini App:`, {
          reply_markup: {
            inline_keyboard: [[{ text: target.title, web_app: { url: `${appUrl}${target.route}` } }]],
          },
        });
      } else {
        await bot.api.sendMessage(chatId, `Раздел доступен в SerkoGram Mini App: ${target.title}`);
      }
      break;
    }

    case 'search': {
      const query = parsed.rawArguments;
      if (!query) {
        await bot.api.sendMessage(
          chatId,
          `🔍 <b>Поиск по архиву</b>\n\nУкажите текст для поиска:\n<code>/search договор</code>\n\nили откройте архив для фильтрации:`,
          {
            parse_mode: 'HTML',
            reply_markup: appUrl
              ? {
                  inline_keyboard: [
                    [{ text: '🔍 Поиск в приложении', web_app: { url: `${appUrl}/archive?search=true` } }],
                  ],
                }
              : undefined,
          }
        );
      } else {
        const encoded = encodeURIComponent(query);
        await bot.api.sendMessage(
          chatId,
          `🔍 Поиск по запросу: <b>${escapeHtml(query)}</b>`,
          {
            parse_mode: 'HTML',
            reply_markup: appUrl
              ? {
                  inline_keyboard: [
                    [{ text: '📄 Показать результаты', web_app: { url: `${appUrl}/archive?search=true&q=${encoded}` } }],
                  ],
                }
              : undefined,
          }
        );
      }
      break;
    }

    case 'coin': {
      const outcomes = ['🦅 Орёл', '🪙 Решка'];
      const result = outcomes[Math.floor(Math.random() * outcomes.length)];
      await bot.api.sendMessage(
        chatId,
        `🪙 <i>Бросаем монетку...</i>\n\nРезультат: <b>${result}</b>!`,
        { parse_mode: 'HTML' }
      );
      break;
    }

    case 'rps': {
      const userChoice = parsed.arguments[0]?.toLowerCase();
      const choices = ['камень', 'ножницы', 'бумага'];

      if (!userChoice || !choices.includes(userChoice)) {
        await bot.api.sendMessage(chatId, `🎮 <b>Камень, ножницы, бумага</b>\nСделайте ваш ход:`, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '🪨 Камень', callback_data: 'rps:play:камень' },
                { text: '✂️ Ножницы', callback_data: 'rps:play:ножницы' },
                { text: '📄 Бумага', callback_data: 'rps:play:бумага' },
              ],
            ],
          },
        });
      } else {
        const res = handleRpsGame(userChoice);
        await bot.api.sendMessage(chatId, res.text, {
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: res.keyboard },
        });
      }
      break;
    }

    case 'ttt': {
      await bot.api.sendMessage(
        chatId,
        `❌⭕ <b>Крестики-нолики</b>\nВыберите клетку для вашего первого хода (❌):`,
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: renderTttKeyboard('---------', false),
          },
        }
      );
      break;
    }

    case 'gpt':
    case 'a_gpt':
    case 'a_gpt_off':
    case 'image': {
      if (!isAiProviderConfigured()) {
        await bot.api.sendMessage(
          chatId,
          `🤖 <b>Нейросеть SerkoGram</b>\n\n` +
            `Для работы функций искусственного интеллекта требуется подключение API-ключа нейросети (OPENAI_API_KEY).\n\n` +
            `Функция временно отключена администратором.`,
          { parse_mode: 'HTML' }
        );
      } else {
        await bot.api.sendMessage(
          chatId,
          `🤖 Функция нейросети активна. Обработка запроса: <i>${escapeHtml(parsed.rawArguments || 'без параметров')}</i>`,
          { parse_mode: 'HTML' }
        );
      }
      break;
    }

    case 'save': {
      if (msg.reply_to_message) {
        try {
          const { saveEphemeralMedia } = await import('@/lib/services/ephemeral-service');
          // In direct bot chat, we don't have a DB chat record for the bot DM
          // but we can still attempt to save the replied media
          const res = await saveEphemeralMedia(
            `bot_dm_${chatId}`,
            msg.reply_to_message.message_id,
            `tg_${userId}`,
            msg.reply_to_message
          );
          if (res.success) {
            await bot.api.sendMessage(
              chatId,
              `✅ <b>Сохранено в архив!</b>\n${res.message}`,
              { parse_mode: 'HTML' }
            );
          } else {
            await bot.api.sendMessage(
              chatId,
              `⚠️ <b>Не удалось сохранить:</b> ${escapeHtml(res.message)}`,
              { parse_mode: 'HTML' }
            );
          }
        } catch (saveErr: any) {
          console.error('[Handler] /save error:', saveErr);
          await bot.api.sendMessage(
            chatId,
            `❌ Ошибка при сохранении: ${escapeHtml(saveErr?.message || 'Неизвестная ошибка')}`,
            { parse_mode: 'HTML' }
          );
        }
      } else {
        await bot.api.sendMessage(
          chatId,
          `ℹ️ Команда <code>/save</code> используется <b>в ответ на сообщение</b>, которое вы хотите принудительно сохранить в архив.`,
          { parse_mode: 'HTML' }
        );
      }
      break;
    }

    case 'гс': {
      await bot.api.sendMessage(
        chatId,
        `🎙 <b>Голосовые сообщения</b>\n\n` +
          `Все входящие и исходящие голосовые сообщения в подключённых Telegram Business чатах автоматически сохраняются в защищённом архиве SerkoGram.\n\n` +
          `Вы можете прослушать их в любое время в разделе «Медиа» в приложении.`,
        {
          parse_mode: 'HTML',
          reply_markup: appUrl
            ? {
                inline_keyboard: [
                  [{ text: '🎙 Открыть голосовые в архиве', web_app: { url: `${appUrl}/archive?filter=voice` } }],
                ],
              }
            : undefined,
        }
      );
      break;
    }

    case 'fco': {
      const quotes = [
        '«Простота — необходимое условие прекрасного.» — Лев Толстой',
        '«Будущее принадлежит тем, кто верит в красоту своей мечты.» — Элеонора Рузвельт',
        '«Код — как юмор. Если его нужно объяснять, значит, он плохой.» — Кори Хаус',
        '«Безопасность — это не состояние, а непрерывный процесс.» — Брюс Шнайер',
      ];
      const quote = quotes[Math.floor(Math.random() * quotes.length)];
      await bot.api.sendMessage(chatId, `✨ <b>Цитата:</b>\n\n<i>${quote}</i>`, { parse_mode: 'HTML' });
      break;
    }

    case 'spam': {
      await bot.api.sendMessage(
        chatId,
        `🛡 <b>Защита от спама и лимиты</b>\n\n` +
          `SerkoGram строго соблюдает правила безопасности Telegram и предотвращает спам.\n` +
          `Все автоматические действия ограничены системными лимитами безопасности.`,
        { parse_mode: 'HTML' }
      );
      break;
    }

    case 'troll':
    case 'a_troll': {
      if (!checkCooldown(userId, 'troll', 10)) {
        await bot.api.sendMessage(chatId, `⏳ Пожалуйста, подождите 10 секунд перед следующим запросом.`);
        return;
      }
      await bot.api.sendMessage(chatId, `🙃 <b>SerkoGram на страже вашего спокойствия!</b>\nВсе ваши сообщения надёжно сохранены.`, {
        parse_mode: 'HTML',
      });
      break;
    }

    default: {
      // Unknown command
      await bot.api.sendMessage(
        chatId,
        `Неизвестная команда. Введите /help для просмотра списка команд или откройте каталог:`,
        {
          reply_markup: appUrl
            ? {
                inline_keyboard: [[{ text: '📋 Каталог команд', web_app: { url: `${appUrl}/commands` } }]],
              }
            : undefined,
        }
      );
      break;
    }
  }
  } catch (err: any) {
    if (err?.error_code === 400 || err?.error_code === 403) {
      console.warn('[Telegram] User blocked bot or chat not accessible:', chatId, err?.description);
      return;
    }
    throw err;
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}