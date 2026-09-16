'use client';

import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { Plus, MessageSquare, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface TicketItem {
  id: string;
  category: 'BUG' | 'CONNECTION' | 'ARCHIVE' | 'PAYMENT' | 'SUGGESTION' | 'OTHER';
  subject: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING_USER' | 'RESOLVED' | 'CLOSED';
  createdAt: string;
  updatedAt: string;
  messages: Array<{ text: string; createdAt: string }>;
}

const CATEGORY_LABELS: Record<string, string> = {
  BUG: 'Ошибка',
  CONNECTION: 'Подключение',
  ARCHIVE: 'Архив',
  PAYMENT: 'Оплата',
  SUGGESTION: 'Предложение',
  OTHER: 'Другое',
};

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  OPEN: { label: 'Открыт', className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  IN_PROGRESS: { label: 'В работе', className: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
  WAITING_USER: { label: 'Ожидает ответа', className: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  RESOLVED: { label: 'Решён', className: 'bg-sg-success/20 text-green-300 border-sg-success/30' },
  CLOSED: { label: 'Закрыт', className: 'bg-sg-surface-3 text-sg-text-muted border-sg-border' },
};

export default function SupportPage() {
  const { data, isLoading } = useQuery<{ items: TicketItem[] }>({
    queryKey: ['tickets'],
    queryFn: async () => {
      const res = await fetch('/api/support/tickets', { credentials: 'include' });
      const json = await res.json();
      return json.data ?? { items: [] };
    },
  });

  const tickets = data?.items ?? [];

  return (
    <main className="flex-1 pb-24 bg-sg-bg text-sg-text-primary">
      <Header
        title="Служба поддержки"
        showBack={false}
        rightAction={
          <Link
            href="/support/new"
            className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-xl font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Создать</span>
          </Link>
        }
      />

      <div className="p-4 space-y-4">
        {/* Banner */}
        <div className="bg-sg-surface p-5 rounded-2xl border border-sg-border flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">Ваши обращения</h2>
            <p className="text-xs text-sg-text-secondary mt-0.5">
              Наша команда ответит в течение нескольких часов
            </p>
          </div>
          <Link
            href="/support/new"
            className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400 flex-shrink-0"
          >
            <Plus className="w-5 h-5" />
          </Link>
        </div>

        {/* Tickets List */}
        <div className="space-y-2">
          {isLoading ? (
            <div className="space-y-2">
              <div className="h-20 skeleton rounded-2xl" />
              <div className="h-20 skeleton rounded-2xl" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-sg-text-muted bg-sg-surface rounded-2xl border border-sg-border p-6">
              <MessageSquare className="w-10 h-10 mb-2 opacity-50" />
              <p className="text-sm font-medium text-white mb-1">Нет активных обращений</p>
              <p className="text-xs text-sg-text-secondary mb-4 max-w-xs">
                Если у вас возникли вопросы или технические сложности, создайте обращение.
              </p>
              <Link
                href="/support/new"
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-xs font-semibold transition-colors"
              >
                Создать обращение
              </Link>
            </div>
          ) : (
            tickets.map((t) => {
              const badge = STATUS_BADGES[t.status] ?? STATUS_BADGES.OPEN;
              const lastMsg = t.messages?.[0]?.text ?? 'Обращение создано';
              const timeStr = new Date(t.updatedAt).toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <Link
                  key={t.id}
                  href={`/support/${t.id}`}
                  className="block bg-sg-surface hover:bg-sg-surface-2 p-4 rounded-2xl border border-sg-border transition-colors space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-2xs text-emerald-400 font-medium uppercase tracking-wider">
                      {CATEGORY_LABELS[t.category] ?? t.category}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  </div>

                  <h3 className="text-sm font-medium text-white line-clamp-1">{t.subject}</h3>
                  <p className="text-xs text-sg-text-secondary line-clamp-1">{lastMsg}</p>

                  <div className="flex items-center justify-between pt-1 text-2xs text-sg-text-muted border-t border-sg-border/50">
                    <span>Тикет #{t.id.slice(0, 8)}</span>
                    <span>{timeStr}</span>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>

      <BottomNav />
    </main>
  );
}