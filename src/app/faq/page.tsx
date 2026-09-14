'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { ChevronDown } from 'lucide-react';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    id: '1',
    question: 'Как работает архив?',
    answer:
      'SerkoGram подключается через официальный Telegram Business Bot API. Когда в ваши подключённые чаты поступает или отправляется сообщение, Telegram отправляет защищённое уведомление на наш сервер, где создаётся защищённая архивная копия в вашей базе данных.',
  },
  {
    id: '2',
    question: 'Как сохраняются удалённые сообщения?',
    answer:
      'Когда собеседник удаляет сообщение в чате, Telegram присылает событие deleted_business_messages. SerkoGram находит ранее сохранённое сообщение в вашем архиве и помечает его флагом «Удалено» с фиксацией времени удаления. SerkoGram не может восстановить сообщения, удалённые до подключения бота.',
  },
  {
    id: '3',
    question: 'Что сохраняется?',
    answer:
      'Сохраняются: текст сообщений, дата и время отправки, автор, фото, видео, документы, голосовые сообщения, видеосообщения, стикеры, а также полная история изменений каждого отредактированного сообщения.',
  },
  {
    id: '4',
    question: 'Какие права получает SerkoGram?',
    answer:
      'Бот получает строго те права, которые вы разрешаете в настройках Telegram Business: получение входящих/исходящих сообщений в выбранных чатах и получение уведомлений об удалении. Бот не имеет доступа к паролям, секретным чатам или каналам.',
  },
  {
    id: '5',
    question: 'Кто имеет доступ к архиву?',
    answer:
      'Доступ к вашему архиву имеете исключительно вы. Доступ проверяется криптографической валидацией Telegram initData (HMAC-SHA256) при каждом входе в Mini App. Никакие данные не передаются третьим лицам.',
  },
  {
    id: '6',
    question: 'Как удалить архив?',
    answer:
      'В разделе «Настройки» перейдите в блок «Приватность» и нажмите «Удалить весь архив». Все ваши сохранённые сообщения, медиафайлы и история будут безвозвратно удалены из базы данных и объектного хранилища.',
  },
  {
    id: '7',
    question: 'Как отключить подключение?',
    answer:
      'Вы можете в любой момент отключить бота в приложении Telegram: перейдите в Настройки → Telegram Business → Чат-боты → SerkoGram и нажмите «Отключить».',
  },
  {
    id: '8',
    question: 'Что происходит при отключении?',
    answer:
      'После отключения бот мгновенно перестаёт получать какие-либо обновления и новые сообщения из ваших чатов. Ранее сохранённый архив остаётся доступен вам в Mini App до тех пор, пока вы сами не решите его удалить.',
  },
  {
    id: '9',
    question: 'Почему некоторые сообщения могут отсутствовать?',
    answer:
      'Сообщения могут отсутствовать, если: 1) они были отправлены до подключения бота к аккаунту; 2) чат не был включён в список обслуживаемых чатов в настройках Telegram Business; 3) бот был временно отключён или заблокирован в настройках Telegram.',
  },
];

export default function FAQPage() {
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({ '1': true });

  const toggleItem = (id: string) => {
    setOpenItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <main className="flex-1 pb-24 bg-sg-bg text-sg-text-primary">
      <Header title="Частые вопросы" showBack={false} />

      <div className="p-4 space-y-3">
        <div className="bg-sg-surface p-4 rounded-2xl border border-sg-border mb-4">
          <h2 className="text-base font-semibold text-white">База знаний SerkoGram</h2>
          <p className="text-xs text-sg-text-secondary mt-1">
            Ответы на главные вопросы о работе сервиса, конфиденциальности и сохранении удалённых сообщений.
          </p>
        </div>

        <div className="space-y-2">
          {FAQ_ITEMS.map((item) => {
            const isOpen = Boolean(openItems[item.id]);
            return (
              <div
                key={item.id}
                className="bg-sg-surface rounded-2xl border border-sg-border overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => toggleItem(item.id)}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-sg-surface-2/50 transition-colors"
                  aria-expanded={isOpen}
                >
                  <span className="text-sm font-medium text-sg-text-primary pr-4">
                    {item.question}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-sg-text-muted flex-shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-sg-purple' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 pt-1 text-xs text-sg-text-secondary leading-relaxed border-t border-sg-border/40">
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <BottomNav />
    </main>
  );
}