'use client';

import { use, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/layout/Header';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { Trash2, Pencil, Image as ImageIcon, MessageSquare, RefreshCw } from 'lucide-react';
import type { MessageItem } from '@/lib/types';

export default function ChatDetailPage({ params }: { params: Promise<{ chatId: string }> }) {
  const resolvedParams = use(params);
  const chatId = resolvedParams.chatId;

  const [activeFilter, setActiveFilter] = useState<'all' | 'deleted' | 'edited' | 'photo'>('all');

  // Fetch chat info
  const { data: chatData } = useQuery({
    queryKey: ['chat', chatId],
    queryFn: async () => {
      const res = await fetch(`/api/chats/${chatId}`, { credentials: 'include' });
      const json = await res.json();
      return json.data;
    },
  });

  // Fetch messages
  const {
    data: messagesData,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery<{ items: MessageItem[] }>({
    queryKey: ['messages', chatId, activeFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ chatId });
      if (activeFilter !== 'all') {
        params.set('filter', activeFilter);
      }
      const res = await fetch(`/api/messages?${params}`, { credentials: 'include' });
      const json = await res.json();
      return json.data ?? { items: [] };
    },
  });

  const messages = messagesData?.items ?? [];

  // Group messages by date for date separators
  const messagesReversed = [...messages].reverse();

  let lastDateStr = '';

  return (
    <main className="flex-1 flex flex-col h-screen max-h-screen bg-sg-bg text-sg-text-primary">
      {/* Header */}
      <Header
        title={chatData?.title ?? `Чат #${chatId.slice(0, 8)}`}
        showBack
        rightAction={
          <button
            type="button"
            onClick={() => refetch()}
            className="p-1.5 rounded-lg hover:bg-sg-surface-2 transition-colors text-sg-text-secondary"
            title="Обновить"
            aria-label="Обновить"
          >
            <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
          </button>
        }
      />

      {/* Filter strip */}
      <div className="flex gap-2 px-4 py-2 border-b border-sg-border bg-sg-surface/50 backdrop-blur overflow-x-auto scrollbar-hide text-xs">
        <button
          type="button"
          onClick={() => setActiveFilter('all')}
          className={`px-3 py-1 rounded-full whitespace-nowrap transition-colors ${
            activeFilter === 'all'
              ? 'bg-sg-purple text-white'
              : 'bg-sg-surface-2 text-sg-text-secondary hover:bg-sg-surface-3'
          }`}
        >
          Все ({chatData?.totalMessages ?? messages.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('deleted')}
          className={`px-3 py-1 rounded-full whitespace-nowrap flex items-center gap-1 transition-colors ${
            activeFilter === 'deleted'
              ? 'bg-red-500 text-white'
              : 'bg-sg-surface-2 text-red-400 hover:bg-sg-surface-3'
          }`}
        >
          <Trash2 className="w-3 h-3" />
          Удалённые ({chatData?.deletedMessages ?? 0})
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('edited')}
          className={`px-3 py-1 rounded-full whitespace-nowrap flex items-center gap-1 transition-colors ${
            activeFilter === 'edited'
              ? 'bg-sg-purple text-white'
              : 'bg-sg-surface-2 text-sg-text-secondary hover:bg-sg-surface-3'
          }`}
        >
          <Pencil className="w-3 h-3" />
          Изменённые ({chatData?.editedMessages ?? 0})
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('photo')}
          className={`px-3 py-1 rounded-full whitespace-nowrap flex items-center gap-1 transition-colors ${
            activeFilter === 'photo'
              ? 'bg-sg-purple text-white'
              : 'bg-sg-surface-2 text-sg-text-secondary hover:bg-sg-surface-3'
          }`}
        >
          <ImageIcon className="w-3 h-3" />
          Медиа ({chatData?.mediaCount ?? 0})
        </button>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {isLoading ? (
          <div className="space-y-4 py-8">
            <div className="flex justify-start">
              <div className="w-48 h-12 skeleton rounded-2xl" />
            </div>
            <div className="flex justify-end">
              <div className="w-64 h-16 skeleton rounded-2xl" />
            </div>
            <div className="flex justify-start">
              <div className="w-56 h-14 skeleton rounded-2xl" />
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-16 text-center text-sg-text-muted">
            <div className="w-14 h-14 rounded-2xl bg-sg-surface-2 flex items-center justify-center mb-3">
              <MessageSquare className="w-6 h-6" />
            </div>
            <p className="text-sm">В этом чате пока нет сохранённых сообщений</p>
          </div>
        ) : (
          messagesReversed.map((msg) => {
            const dateObj = new Date(msg.telegramDate);
            const dateStr = dateObj.toLocaleDateString('ru-RU', {
              day: 'numeric',
              month: 'long',
            });

            const showSeparator = dateStr !== lastDateStr;
            lastDateStr = dateStr;

            return (
              <div key={msg.id}>
                {showSeparator && (
                  <div className="flex justify-center my-3 select-none">
                    <span className="px-3 py-1 rounded-full bg-sg-surface-2/80 text-2xs text-sg-text-secondary backdrop-blur border border-sg-border/50">
                      {dateStr}
                    </span>
                  </div>
                )}
                <MessageBubble msg={msg} />
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}