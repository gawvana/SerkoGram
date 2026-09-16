'use client';

import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import {
  Building2,
  Zap,
  ShieldCheck,
  Archive,
  PowerOff,
  ChevronRight,
  ExternalLink,
  HelpCircle,
  Bell,
  Clock,
  Trash2,
  RefreshCw,
  Lock,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';

export default function InstructionsPage() {
  const sections = [
    {
      num: 1,
      title: 'Что такое SerkoGram?',
      content:
        'SerkoGram — это персональная платформа для автоматизации Telegram-диалогов и ведения защищённого архива сообщений и медиафайлов. Сервис позволяет сохранять важную переписку, фиксировать удалённые или отредактированные сообщения и выполнять точечные команды (.) прямо в управляемых чатах с собеседниками.',
    },
    {
      num: 2,
      title: 'Что такое Telegram Automation Chat?',
      content:
        'Telegram Automation Chat — это продуктовый термин SerkoGram, обозначающий возможность выполнения интерактивных команд (.help, .info, .save, .mute, .coin и др.) в обычных личных диалогах с собеседниками без необходимости создавать отдельные групповые чаты. Вы отправляете сообщение с точкой в начале строки, и SerkoGram обрабатывает его на лету.',
    },
    {
      num: 3,
      title: 'Что такое Connected Business Bot?',
      content:
        'Connected Business Bot — это официальный протокол Telegram Bot API 7.2+, позволяющий привязать чат-бота к вашему профилю. Бот получает вебхуки о входящих и исходящих сообщениях в разрешённых вами чатах, а также право отвечать на сообщения (can_reply). Это на 100% официальный и безопасный метод интеграции.',
    },
    {
      num: 4,
      title: 'Как подключить бота к Telegram?',
      content:
        '1. Откройте Telegram → Настройки.\n2. Перейдите в Telegram Business → Чат-боты.\n3. Введите @SerkoGram_bot.\n4. ОБЯЗАТЕЛЬНО включите переключатель «Отвечать на сообщения» (can_reply).\n5. Выберите чаты («Все личные чаты») и сохраните.',
    },
    {
      num: 5,
      title: 'Подключение пользователей без Telegram Premium',
      content:
        'Подключение официального Connected Business Bot доступно пользователям через стандартное меню Telegram Business. Для работы автоматизации и архива сообщений отдельная платная подписка Telegram Premium не является обязательным требованием для привязки бизнес-бота.',
    },
    {
      num: 6,
      title: 'Возможности Telegram Business vs Premium',
      content:
        'Telegram разделяет возможности: функции самого мессенджера (приветственные сообщения, быстрые ответы, часы работы) предоставляются Telegram в рамках бизнес-профиля. SerkoGram же использует API чат-бота для команд, сохранения истории и фильтрации спама.',
    },
    {
      num: 7,
      title: 'Какие разрешения нужны боту?',
      content:
        '• Чтение сообщений: для сохранения входящих и исходящих сообщений в архив.\n• Ответ на сообщения (can_reply): обязательное право для отправки результатов команд (.help, .info и др.) в чат.\n• Уведомления об удалении: для фиксации удалённых сообщений в базе данных.',
    },
    {
      num: 8,
      title: 'Какие функции доступны в чатах?',
      content:
        '• Информационные: .help (список команд), .info (данные о собеседнике по ответу).\n• Модерация: .mute (удаление входящих сообщений), .panic (экстренная защита).\n• Медиа: .save (тихое сохранение фото, видео, голосовых и одноразовых медиа).\n• Утилиты: .calc (калькулятор), .weather (погода), .flip/.bubble (эффекты текста).\n• Игры: .coin (монетка), .ttt (крестики-нолики), .rps (камень-ножницы-бумага).',
    },
    {
      num: 9,
      title: 'Почему .save может быть недоступен?',
      content:
        'Команда .save работает строго в ответ на медиасообщение (фото, видео, голосовое, документ или одноразовое медиа). Если ответить на текстовое сообщение, бот сообщит, что текстовые сообщения сохраняются автоматически. Также .save недоступен, если файл весит более 20 МБ (ограничение Telegram Bot API) или собеседник удалил его до отправки команды.',
    },
    {
      num: 10,
      title: 'Как проверить статус подключения?',
      content:
        'Вы можете проверить статус на странице «Подключение» в Mini App или отправив команду .info в любом управляемом чате. Если подключение активно, бот мгновенно отобразит статус «Подключено и активно».',
    },
    {
      num: 11,
      title: 'Что делать, если аккаунт отключился?',
      content:
        'Если Telegram сбросил сессию (например, при смене пароля или сбросе активных сессий), откройте Настройки Telegram → Telegram Business → Чат-боты, удалите @SerkoGram_bot и подключите его заново, не забыв включить право «Отвечать на сообщения».',
    },
    {
      num: 12,
      title: 'Как работают уведомления владельца?',
      content:
        'Все подтверждения архивации (.save), изменения прав и оповещения об удалении сообщений отправляются СТРОГО ПРИВАТНО: либо в личные сообщения бота с вами, либо в раздел уведомлений Mini App. Собеседник в чате НИКОГДА не увидит системные подтверждения сохранения.',
    },
    {
      num: 13,
      title: 'Как устроен персональный архив?',
      content:
        'Архив доступен во вкладке «Архив» внизу экрана. Там отображаются все диалоги, количество сохранённых сообщений, фильтры удалённых и отредактированных записей, а также защищённая медиатека с превью.',
    },
    {
      num: 14,
      title: 'Как полностью отключить SerkoGram?',
      content:
        'Чтобы отключить автоматизацию, перейдите в Настройки Telegram → Telegram Business → Чат-боты → выберите @SerkoGram_bot и нажмите «Отключить». После этого бот мгновенно потеряет доступ к вашим чатам.',
    },
  ];

  return (
    <main className="flex-1 pb-24 bg-[#09090b] text-zinc-100">
      <Header title="Инструкции" showBack={false} />

      <div className="p-4 space-y-4 max-w-lg mx-auto w-full animate-fade-in">
        {/* Intro */}
        <div className="bg-[#111114] p-5 rounded-2xl border border-white/[0.08] shadow-sm">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Официальное руководство SerkoGram 2.0</span>
          </div>
          <h2 className="text-lg font-bold text-white mb-1.5">База знаний и руководство</h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Полный справочник по возможностям Telegram Automation Chat, подключению Connected Business Bot и принципам приватного архивирования.
          </p>
        </div>

        {/* 14 Sections Accordion-Style */}
        <div className="space-y-3">
          {sections.map((sec) => (
            <div
              key={sec.num}
              className="bg-[#111114] rounded-2xl p-4 border border-white/[0.08] hover:border-emerald-500/30 transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center flex-shrink-0 text-emerald-400 text-xs font-bold">
                  {sec.num}
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-white mb-1.5">{sec.title}</h3>
                  <div className="text-xs text-zinc-400 leading-relaxed whitespace-pre-line">
                    {sec.content}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick link to Connect */}
        <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 flex items-center justify-between">
          <div>
            <h4 className="text-xs font-semibold text-white">Готовы подключить?</h4>
            <p className="text-2xs text-zinc-400">Настройка займет меньше минуты</p>
          </div>
          <Link
            href="/connect"
            className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold shadow-[0_0_16px_rgba(16,185,129,0.3)] transition-all"
          >
            Подключить
          </Link>
        </div>
      </div>

      <BottomNav />
    </main>
  );
}