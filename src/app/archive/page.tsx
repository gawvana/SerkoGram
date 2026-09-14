'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { BottomNav } from '@/components/layout/BottomNav';
import {
  ArrowLeft,
  Search,
  X,
  Image,
  Trash2,
  Pencil,
  MessageSquare,
} from 'lucide-react';

const FILTERS = [
  { key: 'all', label: 'Все' },
  { key: 'deleted', label: 'Удалённые' },
  { key: 'ephemeral', label: '🕐 Одноразовые' },
  { key: 'edited', label: 'Изменённые' },
  { key: 'media', label: 'Все медиа' },
  { key: 'photo', label: 'Фото' },
  { key: 'video', label: 'Видео' },
  { key: 'voice', label: 'Голосовые' },
  { key: 'document', label: 'Файлы' },
] as const;

interface ChatItem {
  id: string;
  title: string | null;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  totalMessages: number;
  deletedMessages: number;
  photoUrl: string | null;
}

export default function ArchivePage() {
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading } = useQuery<{ items: ChatItem[] }>({
    queryKey: ['chats', activeFilter, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeFilter !== 'all') params.set('filter', activeFilter);
      if (searchQuery) params.set('search', searchQuery);
      const res = await fetch(`/api/chats?${params}`, { credentials: 'include' });
      const json = await res.json();
      return json.data ?? { items: [] };
    },
  });

  const chats = data?.items ?? [];

  return (
    <div className="flex flex-col min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 glass-strong px-4 py-3">
        <div className="flex items-center gap-3 mb-3">
          <Link href="/" className="p-1" aria-label="Назад">
            <ArrowLeft className="w-5 h-5 text-sg-text-secondary" />
          </Link>
          <h1 className="text-lg font-semibold">Архив</h1>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sg-text-muted" />
          <input
            type="text"
            placeholder="Поиск..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-sg-surface-2 rounded-xl pl-9 pr-9 py-2.5 text-sm text-sg-text-primary placeholder:text-sg-text-muted border border-sg-border focus:border-sg-purple focus:outline-none transition-colors"
            aria-label="Поиск по архиву"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              aria-label="Очистить поиск"
            >
              <X className="w-4 h-4 text-sg-text-muted" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors ${
                activeFilter === f.key
                  ? 'bg-sg-purple text-white'
                  : 'bg-sg-surface-2 text-sg-text-secondary hover:bg-sg-surface-3'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </header>

      {/* Chat list */}
      <div className="flex-1">
        {isLoading ? (
          <div className="space-y-0 divide-y divide-sg-border">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <div className="w-12 h-12 rounded-full skeleton" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-24 skeleton rounded" />
                  <div className="h-3 w-40 skeleton rounded" />
                </div>
                <div className="h-3 w-10 skeleton rounded" />
              </div>
            ))}
          </div>
        ) : chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-sg-surface-2 flex items-center justify-center mb-4">
              <MessageSquare className="w-8 h-8 text-sg-text-muted" />
            </div>
            <p className="text-sg-text-secondary text-sm">
              Здесь пока нет архивированных чатов
            </p>
            <Link
              href="/connect"
              className="mt-4 px-6 py-2.5 rounded-xl bg-sg-purple text-white text-sm font-medium hover:bg-sg-purple-dark transition-colors"
            >
              Подключить Telegram
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-sg-border">
            {chats.map((chat) => (
              <Link
                key={chat.id}
                href={`/archive/${chat.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-sg-surface transition-colors"
              >
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-sg-surface-2 flex items-center justify-center flex-shrink-0">
                  {chat.photoUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={chat.photoUrl}
                      alt=""
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-lg font-medium text-sg-purple">
                      {(chat.title ?? '?')[0].toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-sg-text-primary truncate">
                      {chat.title ?? 'Чат'}
                    </p>
                    <span className="text-2xs text-sg-text-muted flex-shrink-0 ml-2">
                      {chat.lastMessageAt
                        ? formatTime(chat.lastMessageAt)
                        : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {chat.deletedMessages > 0 && (
                      <Trash2 className="w-3 h-3 text-sg-error flex-shrink-0" />
                    )}
                    <p className="text-xs text-sg-text-secondary truncate">
                      {chat.lastMessagePreview ?? 'Нет сообщений'}
                    </p>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  {chat.totalMessages > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-sg-surface-3 text-2xs text-sg-text-muted">
                      {chat.totalMessages}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 24 * 60 * 60 * 1000) {
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }

  if (diff < 7 * 24 * 60 * 60 * 1000) {
    return date.toLocaleDateString('ru-RU', { weekday: 'short' });
  }

  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}
