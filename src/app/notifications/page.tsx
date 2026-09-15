'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import {
  Bell,
  CheckCheck,
  Flame,
  CheckCircle2,
  AlertTriangle,
  FolderArchive,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';

interface OwnerNotificationItem {
  id: string;
  type: string;
  title: string;
  text: string;
  chatId?: string | null;
  chatTitle?: string | null;
  messageId?: number | null;
  mediaType?: string | null;
  isEphemeral?: boolean;
  status: string;
  createdAt: string;
}

export default function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{
    items: OwnerNotificationItem[];
    unreadCount: number;
  }>({
    queryKey: ['owner-notifications'],
    queryFn: async () => {
      const res = await fetch('/api/notifications?limit=50', {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      return json.data;
    },
  });

  const markAllMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
        credentials: 'include',
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['owner-notifications-unread'] });
    },
  });

  const getNotificationIcon = (type: string, isEphemeral?: boolean) => {
    if (isEphemeral || type === 'EPHEMERAL_SAVED') {
      return <Flame className="w-5 h-5 text-amber-400" />;
    }
    if (type === 'ARCHIVE_SUCCESS' || type === 'MEDIA_SAVED') {
      return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
    }
    if (type === 'ARCHIVE_FAILURE') {
      return <AlertTriangle className="w-5 h-5 text-rose-400" />;
    }
    if (type === 'COMMAND_RESULT') {
      return <FolderArchive className="w-5 h-5 text-sg-purple" />;
    }
    return <Bell className="w-5 h-5 text-sg-purple" />;
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const items = data?.items || [];
  const unreadCount = data?.unreadCount || 0;

  return (
    <div className="flex flex-col min-h-screen pb-24 bg-sg-bg text-sg-text-primary">
      <Header
        title="Уведомления"
        showBack={true}
        rightAction={
          unreadCount > 0 ? (
            <button
              onClick={() => markAllMutation.mutate()}
              disabled={markAllMutation.isPending}
              className="text-xs text-sg-purple hover:underline flex items-center gap-1 py-1 px-2"
              title="Отметить все как прочитанные"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Прочитать все</span>
            </button>
          ) : null
        }
      />

      <main className="flex-1 px-4 py-3 space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-sg-surface p-4 rounded-xl border border-sg-border space-y-2 animate-pulse">
                <div className="h-4 w-1/3 bg-sg-surface-2 rounded" />
                <div className="h-3 w-3/4 bg-sg-surface-2 rounded" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center p-8 space-y-3 mt-12">
            <div className="w-12 h-12 rounded-2xl bg-sg-surface-2 flex items-center justify-center text-sg-text-muted">
              <Bell className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-sg-text-primary">Нет уведомлений</h3>
            <p className="text-xs text-sg-text-secondary max-w-xs">
              Здесь будут отображаться отчёты о сохранении одноразовых медиа, архивировании и системных событиях.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {items.map((item) => {
              const isUnread = item.status === 'PENDING' || item.status === 'SENT';
              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isUnread
                      ? 'bg-sg-surface-2 border-sg-purple/40 shadow-sm'
                      : 'bg-sg-surface border-sg-border opacity-85'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-sg-surface-3 shrink-0 mt-0.5">
                      {getNotificationIcon(item.type, item.isEphemeral)}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold text-sg-text-primary truncate">
                          {item.title}
                        </h3>
                        <span className="text-[11px] text-sg-text-muted shrink-0">
                          {formatDate(item.createdAt)}
                        </span>
                      </div>

                      {item.chatTitle && (
                        <p className="text-xs text-sg-purple font-medium truncate">
                          Чат: {item.chatTitle}
                        </p>
                      )}

                      <p className="text-xs text-sg-text-secondary leading-relaxed break-words whitespace-pre-line">
                        {item.text}
                      </p>

                      {item.chatId && (
                        <div className="pt-2">
                          <Link
                            href={`/archive/${encodeURIComponent(item.chatId)}`}
                            className="inline-flex items-center gap-1.5 text-xs text-sg-purple hover:underline"
                          >
                            <span>Открыть в архиве</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
