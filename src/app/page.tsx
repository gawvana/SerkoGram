'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useTelegramContext } from '@/providers/TelegramProvider';
import { BottomNav } from '@/components/layout/BottomNav';
import {
  Home,
  ArrowDownLeft,
  ArrowUpRight,
  Trash2,
  Pencil,
  Image as ImageIcon,
  ChevronRight,
  Settings,
  Shield,
  MessageSquare,
  HelpCircle,
} from 'lucide-react';

interface DashboardStats {
  totalMessages: number;
  receivedMessages: number;
  sentMessages: number;
  deletedMessages: number;
  editedMessages: number;
  mediaCount: number;
}

interface UserSettings {
  autoSaveEnabled: boolean;
  saveMessages: boolean;
  saveMedia: boolean;
}

export default function DashboardPage() {
  const { webApp, initData, isReady } = useTelegramContext();
  const queryClient = useQueryClient();
  const [isAuthed, setIsAuthed] = useState(false);

  // Auth
  useEffect(() => {
    if (!isReady) return;
    const doAuth = async () => {
      try {
        const res = await fetch('/api/auth/telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData }),
          credentials: 'include',
        });
        if (res.ok) setIsAuthed(true);
      } catch {
        // In dev mode without Telegram, still show UI
        setIsAuthed(true);
      }
    };
    doAuth();
  }, [isReady, initData]);

  // Stats
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['stats'],
    queryFn: async () => {
      const res = await fetch('/api/stats', { credentials: 'include' });
      const json = await res.json();
      return json.data;
    },
    enabled: isAuthed,
  });

  // Settings
  const { data: settings, isLoading: settingsLoading } = useQuery<UserSettings>({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await fetch('/api/settings', { credentials: 'include' });
      const json = await res.json();
      return json.data;
    },
    enabled: isAuthed,
  });

  const settingsMutation = useMutation({
    mutationFn: async (data: Partial<UserSettings>) => {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings'] }),
  });

  const toggleSetting = (key: keyof UserSettings) => {
    if (!settings) return;
    settingsMutation.mutate({ [key]: !settings[key] });
  };

  return (
    <div className="flex flex-col min-h-screen pb-20">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 sticky top-0 z-10 glass-strong">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sg-purple flex items-center justify-center">
            <span className="text-white text-sm font-bold">S</span>
          </div>
          <h1 className="text-lg font-semibold text-sg-text-primary">SerkoGram</h1>
        </div>
        <Link href="/settings" className="p-2 rounded-lg hover:bg-sg-surface-2 transition-colors" aria-label="Настройки">
          <Settings className="w-5 h-5 text-sg-text-secondary" />
        </Link>
      </header>

      <div className="flex-1 px-4 space-y-4 animate-fade-in">
        {/* Main stat card */}
        <div className="bg-sg-surface rounded-2xl p-5 border border-sg-border">
          <p className="text-sg-text-secondary text-sm">Всего сообщений</p>
          {statsLoading ? (
            <div className="h-10 w-32 skeleton rounded-lg mt-1" />
          ) : (
            <p className="text-4xl font-bold text-sg-text-primary mt-1">
              {(stats?.totalMessages ?? 0).toLocaleString('ru-RU')}
            </p>
          )}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={<ArrowDownLeft className="w-4 h-4" />}
            label="Получено"
            value={stats?.receivedMessages}
            loading={statsLoading}
          />
          <StatCard
            icon={<ArrowUpRight className="w-4 h-4" />}
            label="Отправлено"
            value={stats?.sentMessages}
            loading={statsLoading}
          />
          <StatCard
            icon={<Trash2 className="w-4 h-4" />}
            label="Удалённые"
            value={stats?.deletedMessages}
            loading={statsLoading}
            accent="error"
          />
          <StatCard
            icon={<Pencil className="w-4 h-4" />}
            label="Изменённые"
            value={stats?.editedMessages}
            loading={statsLoading}
          />
          <StatCard
            icon={<ImageIcon className="w-4 h-4" />}
            label="Медиа"
            value={stats?.mediaCount}
            loading={statsLoading}
            className="col-span-2"
          />
        </div>

        {/* Settings toggles */}
        <div className="bg-sg-surface rounded-2xl border border-sg-border divide-y divide-sg-border">
          <ToggleRow
            label="Автосохранение"
            checked={settings?.autoSaveEnabled ?? true}
            loading={settingsLoading}
            onChange={() => toggleSetting('autoSaveEnabled')}
          />
          <ToggleRow
            label="Сохранять сообщения"
            checked={settings?.saveMessages ?? true}
            loading={settingsLoading}
            onChange={() => toggleSetting('saveMessages')}
          />
          <ToggleRow
            label="Сохранять медиа"
            checked={settings?.saveMedia ?? true}
            loading={settingsLoading}
            onChange={() => toggleSetting('saveMedia')}
          />
        </div>

        {/* Navigation links */}
        <div className="bg-sg-surface rounded-2xl border border-sg-border divide-y divide-sg-border">
          <NavRow href="/archive?filter=deleted" icon={<Trash2 className="w-5 h-5 text-sg-error" />} label="Удалённые сообщения" />
          <NavRow href="/settings" icon={<Shield className="w-5 h-5 text-sg-purple" />} label="Приватность" />
          <NavRow href="/archive" icon={<MessageSquare className="w-5 h-5 text-sg-text-secondary" />} label="Чаты" />
          <NavRow href="/faq" icon={<HelpCircle className="w-5 h-5 text-sg-text-secondary" />} label="FAQ" />
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

function StatCard({
  icon,
  label,
  value,
  loading,
  accent,
  className = '',
}: {
  icon: React.ReactNode;
  label: string;
  value?: number;
  loading: boolean;
  accent?: 'error';
  className?: string;
}) {
  return (
    <div className={`bg-sg-surface rounded-xl p-4 border border-sg-border ${className}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={accent === 'error' ? 'text-sg-error' : 'text-sg-text-secondary'}>
          {icon}
        </span>
        <span className="text-xs text-sg-text-muted">{label}</span>
      </div>
      {loading ? (
        <div className="h-7 w-16 skeleton rounded mt-1" />
      ) : (
        <p className={`text-2xl font-semibold ${accent === 'error' ? 'text-sg-error' : 'text-sg-text-primary'}`}>
          {(value ?? 0).toLocaleString('ru-RU')}
        </p>
      )}
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  loading,
  onChange,
}: {
  label: string;
  checked: boolean;
  loading: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5">
      <span className="text-sm text-sg-text-primary">{label}</span>
      {loading ? (
        <div className="w-11 h-6 skeleton rounded-full" />
      ) : (
        <button
          role="switch"
          aria-checked={checked}
          aria-label={label}
          onClick={onChange}
          className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
            checked ? 'bg-sg-purple' : 'bg-sg-surface-3'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
              checked ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      )}
    </div>
  );
}

function NavRow({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between px-4 py-3.5 hover:bg-sg-surface-2 transition-colors"
    >
      <div className="flex items-center gap-3">
        {icon}
        <span className="text-sm text-sg-text-primary">{label}</span>
      </div>
      <ChevronRight className="w-4 h-4 text-sg-text-muted" />
    </Link>
  );
}
