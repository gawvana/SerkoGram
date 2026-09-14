'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import {
  Shield,
  Trash2,
  PowerOff,
  UserX,
  Check,
  AlertTriangle,
  Clock,
  Bell,
  HardDrive,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';

interface UserSettings {
  autoSaveEnabled: boolean;
  saveMessages: boolean;
  saveMedia: boolean;
  saveEdits: boolean;
  saveDeleted: boolean;
  notificationsOn: boolean;
}

interface PrivacySettings {
  retention: 'DAYS_7' | 'DAYS_30' | 'DAYS_90' | 'YEAR_1' | 'FOREVER';
}

export default function SettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [confirmModal, setConfirmModal] = useState<{
    action: 'archive' | 'connection' | 'account' | null;
    title: string;
    description: string;
  }>({ action: null, title: '', description: '' });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch Settings
  const { data: settings, isLoading: settingsLoading } = useQuery<UserSettings>({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await fetch('/api/settings', { credentials: 'include' });
      const json = await res.json();
      return json.data;
    },
  });

  // Fetch Privacy
  const { data: privacy, isLoading: privacyLoading } = useQuery<PrivacySettings>({
    queryKey: ['privacy'],
    queryFn: async () => {
      const res = await fetch('/api/privacy', { credentials: 'include' });
      const json = await res.json();
      return json.data;
    },
  });

  // Mutate Settings
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      showToast('Настройки сохранены');
    },
  });

  // Mutate Privacy Retention
  const privacyMutation = useMutation({
    mutationFn: async (retention: string) => {
      const res = await fetch('/api/privacy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ retention }),
        credentials: 'include',
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['privacy'] });
      showToast('Период хранения обновлён');
    },
  });

  // Destructive Actions
  const destructiveMutation = useMutation({
    mutationFn: async (action: 'archive' | 'connection' | 'account') => {
      const res = await fetch(`/api/privacy?action=${action}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      return res.json();
    },
    onSuccess: (data) => {
      setConfirmModal({ action: null, title: '', description: '' });
      queryClient.invalidateQueries();
      showToast(data.message || 'Действие выполнено');
      if (confirmModal.action === 'account') {
        router.push('/');
      }
    },
    onError: () => {
      showToast('Произошла ошибка при выполнении');
    },
  });

  const toggle = (key: keyof UserSettings) => {
    if (!settings) return;
    settingsMutation.mutate({ [key]: !settings[key] });
  };

  return (
    <main className="flex-1 pb-24 bg-sg-bg text-sg-text-primary">
      <Header title="Настройки и приватность" showBack />

      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-sg-surface border border-sg-purple text-white px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-lg animate-fade-in">
          <Check className="w-3.5 h-3.5 text-sg-purple" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="p-4 space-y-6">
        {/* Section 1: AutoSave & Message Rules */}
        <section className="space-y-2">
          <h3 className="text-xs font-semibold text-sg-purple uppercase tracking-wider px-1">
            Параметры архивации
          </h3>

          <div className="bg-sg-surface rounded-2xl border border-sg-border divide-y divide-sg-border">
            <ToggleRow
              label="Автосохранение"
              description="Автоматически архивировать все входящие и исходящие обновления"
              checked={settings?.autoSaveEnabled ?? true}
              loading={settingsLoading}
              onChange={() => toggle('autoSaveEnabled')}
            />
            <ToggleRow
              label="Сохранять сообщения"
              description="Сохранять текст и метаданные сообщений"
              checked={settings?.saveMessages ?? true}
              loading={settingsLoading}
              onChange={() => toggle('saveMessages')}
            />
            <ToggleRow
              label="Сохранять медиафайлы"
              description="Скачивать и безопасно хранить фото, видео, документы и аудио"
              checked={settings?.saveMedia ?? true}
              loading={settingsLoading}
              onChange={() => toggle('saveMedia')}
            />
            <ToggleRow
              label="Сохранять историю изменений"
              description="Отслеживать и сохранять все версии отредактированных сообщений"
              checked={settings?.saveEdits ?? true}
              loading={settingsLoading}
              onChange={() => toggle('saveEdits')}
            />
            <ToggleRow
              label="Сохранять удалённые сообщения"
              description="Фиксировать и оставлять в архиве удалённые собеседником сообщения"
              checked={settings?.saveDeleted ?? true}
              loading={settingsLoading}
              onChange={() => toggle('saveDeleted')}
            />
            <ToggleRow
              label="Уведомления бота"
              description="Присылать отчёты и сводки в сервисный диалог бота"
              checked={settings?.notificationsOn ?? false}
              loading={settingsLoading}
              onChange={() => toggle('notificationsOn')}
            />
          </div>
        </section>

        {/* Section 2: Privacy & Retention */}
        <section className="space-y-2">
          <h3 className="text-xs font-semibold text-sg-purple uppercase tracking-wider px-1 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Срок хранения данных
          </h3>

          <div className="bg-sg-surface rounded-2xl border border-sg-border p-4 space-y-3">
            <p className="text-xs text-sg-text-secondary leading-relaxed">
              По истечении выбранного срока старые сообщения и связанные медиафайлы автоматически очищаются.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
              {[
                { key: 'DAYS_7', label: '7 дней' },
                { key: 'DAYS_30', label: '30 дней' },
                { key: 'DAYS_90', label: '90 дней' },
                { key: 'YEAR_1', label: '1 год' },
                { key: 'FOREVER', label: 'Навсегда' },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => privacyMutation.mutate(item.key)}
                  className={`py-2 px-3 rounded-xl text-xs font-medium border transition-all text-center ${
                    privacy?.retention === item.key
                      ? 'bg-sg-purple/20 border-sg-purple text-white'
                      : 'bg-sg-surface-2 border-sg-border text-sg-text-secondary hover:bg-sg-surface-3'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Section 3: Connection Link */}
        <section className="space-y-2">
          <h3 className="text-xs font-semibold text-sg-text-muted uppercase tracking-wider px-1">
            Подключение Telegram
          </h3>
          <div className="bg-sg-surface rounded-2xl border border-sg-border p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Telegram Business</p>
              <p className="text-xs text-sg-text-secondary mt-0.5">Управление правами и чатами</p>
            </div>
            <Link
              href="/connect"
              className="flex items-center gap-1 text-xs text-sg-purple font-medium hover:underline"
            >
              Открыть <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>

        {/* Section 4: Dangerous Area (Confirm Dialogs) */}
        <section className="space-y-2">
          <h3 className="text-xs font-semibold text-red-400 uppercase tracking-wider px-1 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            Опасная зона
          </h3>

          <div className="bg-sg-surface rounded-2xl border border-red-500/20 divide-y divide-red-500/15 overflow-hidden">
            <button
              type="button"
              onClick={() =>
                setConfirmModal({
                  action: 'archive',
                  title: 'Очистить весь архив?',
                  description:
                    'Все ваши сохранённые сообщения, медиафайлы и история редактирования будут удалены без возможности восстановления.',
                })
              }
              className="w-full p-4 flex items-center gap-3 text-left hover:bg-red-500/5 transition-colors"
            >
              <Trash2 className="w-5 h-5 text-red-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-400">Удалить весь архив</p>
                <p className="text-xs text-sg-text-muted mt-0.5">Удаляет все сообщения и историю переписок</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() =>
                setConfirmModal({
                  action: 'connection',
                  title: 'Отключить интеграцию?',
                  description:
                    'Бот будет деактивирован и прекратит получение обновлений. Существующий архив сохранится.',
                })
              }
              className="w-full p-4 flex items-center gap-3 text-left hover:bg-red-500/5 transition-colors"
            >
              <PowerOff className="w-5 h-5 text-red-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-400">Отключить подключение</p>
                <p className="text-xs text-sg-text-muted mt-0.5">Остановить приём новых сообщений от Telegram</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() =>
                setConfirmModal({
                  action: 'account',
                  title: 'Удалить аккаунт навсегда?',
                  description:
                    'Будут удалены все ваши настройки, подключения, архив сообщений, тикеты поддержки и аккаунт пользователя.',
                })
              }
              className="w-full p-4 flex items-center gap-3 text-left hover:bg-red-500/5 transition-colors"
            >
              <UserX className="w-5 h-5 text-red-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-500">Удалить аккаунт</p>
                <p className="text-xs text-sg-text-muted mt-0.5">Полное безвозвратное удаление всех ваших данных</p>
              </div>
            </button>
          </div>
        </section>
      </div>

      {/* Confirmation Modal Dialog */}
      {confirmModal.action && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-sg-surface border border-red-500/30 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-5 h-5" />
              <h4 className="font-semibold text-base">{confirmModal.title}</h4>
            </div>

            <p className="text-xs text-sg-text-secondary leading-relaxed">
              {confirmModal.description}
            </p>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal({ action: null, title: '', description: '' })}
                className="flex-1 py-2.5 rounded-xl bg-sg-surface-2 text-xs font-medium text-sg-text-primary hover:bg-sg-surface-3 transition-colors"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => confirmModal.action && destructiveMutation.mutate(confirmModal.action)}
                disabled={destructiveMutation.isPending}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-xs font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {destructiveMutation.isPending ? 'Удаление...' : 'Подтвердить'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </main>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  loading,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  loading: boolean;
  onChange: () => void;
}) {
  return (
    <div className="p-4 flex items-center justify-between gap-4">
      <div className="flex-1">
        <p className="text-sm font-medium text-sg-text-primary">{label}</p>
        <p className="text-2xs text-sg-text-muted mt-0.5 leading-normal">{description}</p>
      </div>

      {loading ? (
        <div className="w-11 h-6 skeleton rounded-full flex-shrink-0" />
      ) : (
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={onChange}
          className={`relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${
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