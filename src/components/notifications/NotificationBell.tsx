'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Bell } from 'lucide-react';

export function NotificationBell() {
  const { data } = useQuery<{ unreadCount: number }>({
    queryKey: ['owner-notifications-unread'],
    queryFn: async () => {
      const res = await fetch('/api/notifications?unreadOnly=true&limit=1', {
        credentials: 'include',
      });
      if (!res.ok) return { unreadCount: 0 };
      const json = await res.json();
      return { unreadCount: json.data?.unreadCount ?? 0 };
    },
    refetchInterval: 15000,
  });

  const unreadCount = data?.unreadCount ?? 0;

  return (
    <Link
      href="/notifications"
      className="relative p-2 rounded-lg hover:bg-sg-surface-2 transition-colors text-sg-text-secondary hover:text-sg-text-primary"
      aria-label="Уведомления"
    >
      <Bell className="w-5 h-5" />
      {unreadCount > 0 && (
        <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-white shadow-sm">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Link>
  );
}
