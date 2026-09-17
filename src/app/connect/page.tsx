'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { BottomNav } from '@/components/layout/BottomNav';
import { useTelegramContext } from '@/providers/TelegramProvider';
import {
  ArrowLeft,
  Building2,
  Zap,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  Clock,
  KeyRound,
} from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

export default function ConnectPage() {
  const { t } = useTranslation();
  const { webApp, initData } = useTelegramContext();
  const [connection, setConnection] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const fetchConnection = useCallback(async (manual = false) => {
    if (manual) {
      setIsRefreshing(true);
      webApp?.HapticFeedback?.impactOccurred('light');
    }
    try {
      const headers: Record<string, string> = {};
      if (initData) {
        headers['x-telegram-init-data'] = initData;
      }

      const res = await fetch('/api/connections', {
        headers,
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        const list: any[] = Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.data?.connections)
          ? data.data.connections
          : data?.data?.connection
          ? [data.data.connection]
          : [];

        const active = list.find((c: any) => c.status === 'ACTIVE' && c.isEnabled) || list[0] || null;
        setConnection(active);
        setLastChecked(new Date());
      }
    } catch (err) {
      console.error('[ConnectPage] Failed to fetch connections:', err);
    } finally {
      setLoading(false);
      if (manual) {
        setTimeout(() => setIsRefreshing(false), 400);
      }
    }
  }, [initData, webApp]);

  useEffect(() => {
    fetchConnection();
  }, [fetchConnection]);

  // Auto-polling: every 3 seconds while not active to catch Telegram Business connection instantly
  useEffect(() => {
    const isConnActive = connection?.status === 'ACTIVE' && connection?.isEnabled;
    if (isConnActive) {
      return;
    }

    const timer = setInterval(() => {
      fetchConnection();
    }, 3000);

    return () => clearInterval(timer);
  }, [fetchConnection, connection?.status, connection?.isEnabled]);

  // Re-check on window focus or visibility change
  useEffect(() => {
    const handleVisible = () => {
      if (document.visibilityState === 'visible') {
        fetchConnection(false);
      }
    };
    const handleFocus = () => {
      fetchConnection(false);
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisible);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisible);
    };
  }, [fetchConnection]);

  const isConnected = connection?.status === 'ACTIVE' && connection?.isEnabled;
  const canReply = connection?.canReply;

  return (
    <div className="flex flex-col min-h-screen pb-24 bg-[#09090b] text-zinc-100">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-[#09090b]/80 backdrop-blur-xl border-b border-white/[0.08] px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors" aria-label="Назад">
              <ArrowLeft className="w-5 h-5 text-zinc-400" />
            </Link>
            <div>
              <h1 className="text-base font-semibold text-white">Подключение SerkoGram</h1>
              <p className="text-2xs text-zinc-400">Telegram Business & Automation Architecture</p>
            </div>
          </div>

          <button
            onClick={() => fetchConnection(true)}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 text-xs font-medium border border-white/[0.06] transition-all active:scale-95 disabled:opacity-50"
            title="Проверить статус"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : 'text-zinc-400'}`} />
            <span className="hidden sm:inline">Обновить</span>
          </button>
        </div>
      </header>

      <div className="flex-1 px-4 py-4 space-y-4 max-w-lg mx-auto w-full animate-fade-in">
        {/* Status Card */}
        <div
          className={`p-4 rounded-2xl border transition-all ${
            isConnected
              ? 'bg-emerald-950/20 border-emerald-500/30 shadow-[0_0_24px_rgba(16,185,129,0.12)]'
              : 'bg-[#111114] border-white/[0.08]'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div
                className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${
                  isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-pulse'
                }`}
              />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-white">
                    {loading
                      ? 'Проверка соединения...'
                      : isConnected
                      ? 'Подключение активно'
                      : 'Ожидает подключения'}
                  </h3>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                      isConnected
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {isConnected ? 'ONLINE' : 'WAITING'}
                  </span>
                </div>
                <p className="text-2xs text-zinc-400 mt-1 leading-normal">
                  {isConnected
                    ? canReply
                      ? 'Все права настроены: чтение переписки и автоответы на команды активны.'
                      : 'Внимание: отключено право can_reply (команды в чате не смогут отвечать).'
                    : 'Бот ожидает подключения в Telegram Business. После добавления статус обновится автоматически.'}
                </p>

                {/* Additional Connection Details if connected */}
                {isConnected && connection && (
                  <div className="mt-3 pt-2.5 border-t border-white/[0.06] grid grid-cols-2 gap-2 text-[11px] text-zinc-400">
                    <div className="flex items-center gap-1.5">
                      <KeyRound className="w-3 h-3 text-emerald-400" />
                      <span className="truncate">ID: {connection.telegramConnectionId || connection.id}</span>
                    </div>
                    {connection.connectedAt && (
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-zinc-500" />
                        <span>{new Date(connection.connectedAt).toLocaleDateString('ru-RU')}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => fetchConnection(true)}
              className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-all active:scale-95"
              aria-label="Перепроверить статус соединения"
              title="Перепроверить"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>

          {!isConnected && (
            <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between text-2xs text-zinc-400">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                Авто-проверка каждые 3 секунды...
              </span>
              {lastChecked && (
                <span className="text-zinc-500">
                  Посл. проверка: {lastChecked.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              )}
            </div>
          )}
        </div>

        {/* MODE 1: Connected Business Bot (Official & Working) */}
        <div className="bg-[#111114] rounded-2xl p-5 border border-white/[0.08] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0 text-emerald-400 border border-emerald-500/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-white">Connected Business Bot</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-medium border border-emerald-500/30">
                  Основной режим
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                Официальный протокол Telegram Bot API (7.2+) для управления бизнес-чатами и диалогами. 
                Не требует постоянного сервера у пользователя и работает мгновенно через облачные вебхуки.
              </p>

              {/* Clarification about Non-Premium */}
              <div className="mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-zinc-300 space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Доступно для всех пользователей</span>
                </div>
                <p className="text-2xs text-zinc-400 leading-normal">
                  Подключение бизнес-бота является штатной возможностью Telegram. Вам не требуется отдельная платная подписка для подключения бота через Telegram Business настройки.
                </p>
              </div>

              {/* Permissions Checklist */}
              <div className="mt-4 space-y-2">
                <p className="text-2xs font-semibold uppercase tracking-wider text-zinc-400">Требуемые права в Telegram:</p>
                <PermissionItem
                  label="Чтение сообщений (read_messages)"
                  detail="Для автоматического архивирования входящих и исходящих сообщений"
                  granted={true}
                />
                <PermissionItem
                  label="Ответ на сообщения (can_reply)"
                  detail="Критично: без этого бот не может отправлять ответы на .help, .info, .coin в чат"
                  granted={canReply ?? true}
                />
                <PermissionItem
                  label="Уведомления об удалении (delete_messages)"
                  detail="Фиксация удалённых собеседником сообщений в архиве"
                  granted={true}
                />
              </div>

              {/* Step-by-step instructions */}
              <div className="mt-5 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
                <p className="text-xs font-semibold text-emerald-400">Как подключить за 1 минуту:</p>
                <ol className="text-xs text-zinc-300 space-y-2.5 list-decimal pl-4 marker:text-emerald-400 marker:font-bold">
                  <li>Откройте Telegram → <b>Настройки</b>.</li>
                  <li>Перейдите в раздел <b>Telegram Business</b> → <b>Чат-боты</b>.</li>
                  <li>В строке поиска введите <code className="px-1.5 py-0.5 rounded bg-zinc-800 text-emerald-400 font-mono">@SerkoGram_bot</code>.</li>
                  <li>Включите переключатель разрешения отвечать: <b>«Отвечать на сообщения»</b>.</li>
                  <li>Выберите список чатов (рекомендуется: «Все личные чаты») и нажмите <b>«Готово»</b>.</li>
                </ol>
              </div>

              <a
                href="https://t.me/SerkoGram_bot"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold shadow-[0_0_20px_rgba(16,185,129,0.25)] transition-all active:scale-[0.98]"
              >
                Открыть @SerkoGram_bot в Telegram
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>

        {/* MODE 2: MTProto Userbot (Honest Unavailable Status) */}
        <div className="bg-[#111114] rounded-2xl p-5 border border-white/[0.08] opacity-80">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center flex-shrink-0 text-zinc-500 border border-zinc-700">
              <Zap className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-zinc-200">MTProto Userbot / Режим D</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-medium border border-zinc-700">
                  Недоступно
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                Клиентская сессия MTProto через TDLib/Telethon для чтения закрытых чатов и статусов (вечный онлайн, автонабор текста).
              </p>

              <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 flex gap-2 items-start">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium text-amber-300">Архитектурное ограничение:</span>
                  <p className="text-2xs text-zinc-400 mt-0.5 leading-normal">
                    MTProto требует постоянного фонового демона (TCP socket connection). В архитектуре SerkoGram (Vercel Serverless) постоянные демоны не поддерживаются. Все функции автоматизации выполняются исключительно через <b>Connected Business Bot API</b>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Security & Privacy Guarantee */}
        <div className="bg-[#111114] rounded-2xl p-4 border border-white/[0.08] flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <p className="text-2xs text-zinc-400 leading-normal">
            <b>Гарантия приватности:</b> Ваши сообщения шифруются и сохраняются исключительно в вашем персональном аккаунте. Никакие данные не передаются третьим лицам.
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

function PermissionItem({
  label,
  detail,
  granted,
}: {
  label: string;
  detail?: string;
  granted: boolean;
}) {
  return (
    <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
      <div className="flex items-center gap-2">
        {granted ? (
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
        ) : (
          <XCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
        )}
        <span className="text-xs font-medium text-zinc-200">{label}</span>
      </div>
      {detail && <p className="text-[11px] text-zinc-400 ml-5.5 mt-0.5">{detail}</p>}
    </div>
  );
}
