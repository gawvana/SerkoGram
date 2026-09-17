'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { BottomNav } from '@/components/layout/BottomNav';
import { useTelegramContext } from '@/providers/TelegramProvider';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  Clock,
  KeyRound,
  Bot,
  Crown,
  HelpCircle,
  Activity,
} from 'lucide-react';
import type { AccountConnectionState, ConnectionMode, PremiumState } from '@/lib/types';

export default function ConnectPage() {
  const { webApp, initData } = useTelegramContext();

  const [connection, setConnection] = useState<any>(null);
  const [connections, setConnections] = useState<any[]>([]);
  const [accountState, setAccountState] = useState<AccountConnectionState | null>(null);
  const [botUsername, setBotUsername] = useState<string>('SerkoGram_bot');
  const [connectUrls, setConnectUrls] = useState<Record<string, string>>({
    bot: 'https://t.me/SerkoGram_bot',
    businessSettings: 'tg://settings/business',
    automationChat: 'https://t.me/SerkoGram_bot?start=connect_automation',
    premiumBusiness: 'https://t.me/SerkoGram_bot?start=connect_business',
  });

  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [selectedTab, setSelectedTab] = useState<ConnectionMode>('AUTOMATION_CHAT');
  const [userInteractedTab, setUserInteractedTab] = useState(false);

  // Initial client-side Telegram Premium detection from Mini App WebApp context
  const clientTgPremium: PremiumState = useMemo(() => {
    const rawPremium = webApp?.initDataUnsafe?.user?.is_premium;
    if (typeof rawPremium === 'boolean') {
      return rawPremium ? 'PREMIUM_TRUE' : 'PREMIUM_FALSE';
    }
    return 'PREMIUM_UNKNOWN';
  }, [webApp]);

  // Authoritative Premium State: Prefer backend DB / Telegram Business update, fallback to client
  const effectivePremium: PremiumState = useMemo(() => {
    if (accountState?.premium && accountState.premium !== 'PREMIUM_UNKNOWN') {
      return accountState.premium;
    }
    if (connection?.telegramPremium === true) return 'PREMIUM_TRUE';
    if (connection?.telegramPremium === false) return 'PREMIUM_FALSE';
    return clientTgPremium;
  }, [accountState?.premium, connection?.telegramPremium, clientTgPremium]);

  // Set default tab based on detected account state if user hasn't manually switched tabs
  useEffect(() => {
    if (!userInteractedTab) {
      if (effectivePremium === 'PREMIUM_TRUE' || connection?.connectionMode === 'PREMIUM_BUSINESS') {
        setSelectedTab('PREMIUM_BUSINESS');
      } else {
        setSelectedTab('AUTOMATION_CHAT');
      }
    }
  }, [effectivePremium, connection?.connectionMode, userInteractedTab]);

  const fetchConnection = useCallback(
    async (manual = false) => {
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
          const json = await res.json();
          const payload = json?.data;
          const list: any[] = Array.isArray(payload)
            ? payload
            : Array.isArray(payload?.connections)
            ? payload.connections
            : payload?.connection
            ? [payload.connection]
            : [];

          const active =
            payload?.connection ||
            list.find((c: any) => c.status === 'ACTIVE' && c.isEnabled) ||
            list[0] ||
            null;

          setConnection(active);
          setConnections(list);

          if (payload?.accountState) {
            setAccountState(payload.accountState);
          }
          if (payload?.botUsername) {
            setBotUsername(payload.botUsername);
          }
          if (payload?.connectUrls) {
            setConnectUrls(payload.connectUrls);
          }

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
    },
    [initData, webApp]
  );

  // Initial load
  useEffect(() => {
    fetchConnection();
  }, [fetchConnection]);

  // Automatic polling: every 2.5 seconds while status is WAITING (stops immediately when ACTIVE)
  useEffect(() => {
    const isConnActive = connection?.status === 'ACTIVE' && connection?.isEnabled;
    if (isConnActive) {
      return;
    }

    const timer = setInterval(() => {
      fetchConnection(false);
    }, 2500);

    return () => clearInterval(timer);
  }, [fetchConnection, connection?.status, connection?.isEnabled]);

  // Immediate refetch on window focus or visibility change (return from Telegram settings)
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

  const permissions = useMemo(() => {
    return {
      can_read_messages: (connection as any)?.canReadMessages ?? true,
      can_reply: connection?.canReply ?? false,
      can_delete_sent_messages: (connection as any)?.canDeleteSentMessages ?? true,
      can_delete_all_messages: (connection as any)?.canDeleteAllMessages ?? false,
    };
  }, [connection]);

  const activeMode: ConnectionMode =
    (connection?.connectionMode as ConnectionMode) ||
    (effectivePremium === 'PREMIUM_TRUE' ? 'PREMIUM_BUSINESS' : 'AUTOMATION_CHAT');

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
              <p className="text-2xs text-zinc-400">Telegram Business & Automation Flow</p>
            </div>
          </div>

          <button
            onClick={() => fetchConnection(true)}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 text-xs font-medium border border-white/[0.06] transition-all active:scale-95 disabled:opacity-50"
            title="Проверить статус соединения"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : 'text-zinc-400'}`} />
            <span className="hidden sm:inline">Обновить</span>
          </button>
        </div>
      </header>

      <div className="flex-1 px-4 py-4 space-y-4 max-w-lg mx-auto w-full animate-fade-in">
        {/* Connection State Card */}
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
                  loading
                    ? 'bg-zinc-500 animate-pulse'
                    : isConnected
                    ? 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]'
                    : 'bg-amber-400 animate-pulse'
                }`}
              />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
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
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${
                      activeMode === 'PREMIUM_BUSINESS'
                        ? 'bg-amber-500/15 text-amber-300 border border-amber-500/25'
                        : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                    }`}
                  >
                    {activeMode === 'PREMIUM_BUSINESS' ? 'Telegram Business' : 'Automation Chat'}
                  </span>
                </div>

                <p className="text-2xs text-zinc-400 mt-1 leading-normal">
                  {isConnected
                    ? canReply
                      ? 'Соединение авторизовано: чтение переписки и автоответы на команды активны.'
                      : 'Внимание: опция «Отвечать на сообщения» отключена в Telegram. Включите can_reply.'
                    : 'Ожидание добавления бота в Telegram. Выполните подключение ниже — статус обновится автоматически.'}
                </p>

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
                Авто-проверка каждые 2.5 сек...
              </span>
              {lastChecked && (
                <span className="text-zinc-500">
                  Посл. проверка: {lastChecked.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Onboarding Mode Tabs */}
        <div className="flex rounded-xl bg-zinc-900/80 p-1 border border-white/[0.06]">
          <button
            onClick={() => {
              setSelectedTab('AUTOMATION_CHAT');
              setUserInteractedTab(true);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
              selectedTab === 'AUTOMATION_CHAT'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Automation Chat</span>
            {effectivePremium === 'PREMIUM_FALSE' && (
              <span className="text-[9px] px-1.5 py-0.2 bg-emerald-500/30 rounded text-emerald-200">Рекомендуется</span>
            )}
          </button>

          <button
            onClick={() => {
              setSelectedTab('PREMIUM_BUSINESS');
              setUserInteractedTab(true);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
              selectedTab === 'PREMIUM_BUSINESS'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span>Telegram Business</span>
            {effectivePremium === 'PREMIUM_TRUE' && (
              <span className="text-[9px] px-1.5 py-0.2 bg-amber-500/30 rounded text-amber-200">Premium</span>
            )}
          </button>
        </div>

        {/* TAB 1: Automation Chat (Connected Business Bot for all accounts) */}
        {selectedTab === 'AUTOMATION_CHAT' && (
          <div className="bg-[#111114] rounded-2xl p-5 border border-white/[0.08] relative overflow-hidden animate-fade-in">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0 text-emerald-400 border border-emerald-500/20">
                <Bot className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-semibold text-white">Automation Chat</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-medium border border-emerald-500/30">
                    Connected Business Bot
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                  Официальное подключение через Connected Business Bot протокол Telegram Bot API. Работает для всех пользователей Telegram без обязательной покупки отдельной подписки.
                </p>

                {/* Clarification banner */}
                <div className="mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-zinc-300 space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Доступно для обычных и премиум аккаунтов</span>
                  </div>
                  <p className="text-2xs text-zinc-400 leading-normal">
                    Telegram позволяет подключать автоматизацию бизнес-ботов ко всем аккаунтам. Бот работает в облачном режиме через безопасные вебхуки SerkoGram.
                  </p>
                </div>

                {/* Step-by-step instructions */}
                <div className="mt-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
                  <p className="text-xs font-semibold text-emerald-400">Пошаговое подключение Automation Chat:</p>
                  <ol className="text-xs text-zinc-300 space-y-2.5 list-decimal pl-4 marker:text-emerald-400 marker:font-bold">
                    <li>Откройте Telegram → <b>Настройки</b>.</li>
                    <li>Перейдите в раздел <b>Telegram Business</b> (или <b>Чат-боты</b>).</li>
                    <li>В строке поиска выберите <code className="px-1.5 py-0.5 rounded bg-zinc-800 text-emerald-400 font-mono">@{botUsername}</code>.</li>
                    <li>Включите обязательное разрешение: <b>«Отвечать на сообщения»</b> (`can_reply`).</li>
                    <li>Выберите чаты (рекомендуется: «Все личные чаты») и нажмите <b>«Готово»</b>.</li>
                  </ol>
                </div>

                <a
                  href={connectUrls.automationChat || `https://t.me/${botUsername}?start=connect_automation`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold shadow-[0_0_20px_rgba(16,185,129,0.25)] transition-all active:scale-[0.98]"
                >
                  Подключить Automation Chat (@{botUsername})
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Telegram Business (Premium Flow) */}
        {selectedTab === 'PREMIUM_BUSINESS' && (
          <div className="bg-[#111114] rounded-2xl p-5 border border-white/[0.08] relative overflow-hidden animate-fade-in">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center flex-shrink-0 text-amber-400 border border-amber-500/20">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-semibold text-white">Telegram Business Flow</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-medium border border-amber-500/30">
                    Premium Onboarding
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                  Полная интеграция с разделом Telegram Business. Позволяет боту управлять чатами, отвечать на команды, архивировать входящую и исходящую переписку и сохранять медиа.
                </p>

                {/* Premium status note */}
                <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-zinc-300 space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-400 font-medium">
                    <Crown className="w-3.5 h-3.5" />
                    <span>
                      {effectivePremium === 'PREMIUM_TRUE'
                        ? 'Telegram Premium подтвержден'
                        : effectivePremium === 'PREMIUM_FALSE'
                        ? 'Стандартный аккаунт (поддерживается подключение через Чат-боты)'
                        : 'Определение Premium через статус BusinessConnection'}
                    </span>
                  </div>
                  <p className="text-2xs text-zinc-400 leading-normal">
                    Используется штатный механизм Telegram Connected Business Bot, гарантирующий безопасность сессии без передачи паролей или MTProto сессий.
                  </p>
                </div>

                {/* Step-by-step instructions */}
                <div className="mt-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
                  <p className="text-xs font-semibold text-amber-400">Инструкция для Telegram Business:</p>
                  <ol className="text-xs text-zinc-300 space-y-2.5 list-decimal pl-4 marker:text-amber-400 marker:font-bold">
                    <li>Откройте Telegram → <b>Настройки</b> → <b>Telegram Business</b>.</li>
                    <li>Нажмите <b>«Чат-боты»</b>.</li>
                    <li>В поле поиска укажите <code className="px-1.5 py-0.5 rounded bg-zinc-800 text-amber-300 font-mono">@{botUsername}</code>.</li>
                    <li>Активируйте переключатель <b>«Отвечать на сообщения»</b>.</li>
                    <li>Сохраните изменения и вернитесь в SerkoGram.</li>
                  </ol>
                </div>

                <div className="mt-4 flex flex-col sm:flex-row gap-2">
                  <a
                    href={connectUrls.premiumBusiness || `https://t.me/${botUsername}?start=connect_business`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 text-xs font-semibold shadow-[0_0_20px_rgba(245,158,11,0.2)] transition-all active:scale-[0.98]"
                  >
                    Подключить в Telegram Business
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <a
                    href={connectUrls.businessSettings || 'tg://settings/business'}
                    className="px-4 py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 text-xs font-medium border border-white/[0.08] text-center transition-all"
                  >
                    Открыть Настройки
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Live Telegram Connection Diagnostics (Item 11) */}
        <div className="bg-[#111114] rounded-2xl p-5 border border-white/[0.08] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                Диагностика соединения
              </h3>
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">Authoritative DB</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* 1. Premium */}
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <span className="text-[11px] text-zinc-400 block mb-1">Telegram Premium:</span>
              <div className="flex items-center gap-1.5">
                {effectivePremium === 'PREMIUM_TRUE' ? (
                  <>
                    <Crown className="w-3.5 h-3.5 text-amber-400" />
                    <span className="font-semibold text-amber-300">true</span>
                  </>
                ) : effectivePremium === 'PREMIUM_FALSE' ? (
                  <>
                    <XCircle className="w-3.5 h-3.5 text-zinc-400" />
                    <span className="font-semibold text-zinc-300">false</span>
                  </>
                ) : (
                  <>
                    <HelpCircle className="w-3.5 h-3.5 text-amber-400/80" />
                    <span className="font-semibold text-amber-200/80">unknown</span>
                  </>
                )}
              </div>
            </div>

            {/* 2. Connection Status */}
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <span className="text-[11px] text-zinc-400 block mb-1">Статус Connection:</span>
              <span
                className={`font-semibold text-xs px-2 py-0.5 rounded-md inline-block ${
                  isConnected
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : connection?.status === 'ERROR'
                    ? 'bg-rose-500/20 text-rose-300'
                    : 'bg-amber-500/20 text-amber-300'
                }`}
              >
                {isConnected ? 'ACTIVE' : connection?.status || 'WAITING'}
              </span>
            </div>

            {/* 3. Mode */}
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <span className="text-[11px] text-zinc-400 block mb-1">Режим Onboarding:</span>
              <span className="font-semibold text-zinc-200 text-[11px] truncate block">
                {activeMode}
              </span>
            </div>

            {/* 4. BusinessConnection ID */}
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <span className="text-[11px] text-zinc-400 block mb-1">BusinessConnection ID:</span>
              <span className="font-mono text-[11px] text-zinc-300 truncate block">
                {connection?.telegramConnectionId || connection?.id || '—'}
              </span>
            </div>
          </div>

          {/* Permissions Checklist (Item 11) */}
          <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Разрешения в Telegram (Permissions):
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <PermissionItem
                label="can_read_messages"
                detail="Чтение сообщений чатов"
                granted={permissions.can_read_messages}
              />
              <PermissionItem
                label="can_reply"
                detail="Ответ на команды бота"
                granted={permissions.can_reply}
              />
              <PermissionItem
                label="can_delete_sent_messages"
                detail="Удаление отправленных ботом"
                granted={permissions.can_delete_sent_messages}
              />
              <PermissionItem
                label="can_delete_all_messages"
                detail="Удаление любых сообщений"
                granted={permissions.can_delete_all_messages}
              />
            </div>
          </div>
        </div>

        {/* Security & Privacy Guarantee */}
        <div className="bg-[#111114] rounded-2xl p-4 border border-white/[0.08] flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <p className="text-2xs text-zinc-400 leading-normal">
            <b>Безопасность:</b> Соединение защищено шифрованием Telegram Bot API. Все данные и медиа сохраняются в вашем персональном защищенном хранилище.
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
    <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-start gap-2.5">
      {granted ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
      ) : (
        <XCircle className="w-4 h-4 text-zinc-500 flex-shrink-0 mt-0.5" />
      )}
      <div>
        <span className={`text-xs font-medium font-mono ${granted ? 'text-zinc-200' : 'text-zinc-400'}`}>
          {label}
        </span>
        {detail && <p className="text-[11px] text-zinc-500 mt-0.5 leading-tight">{detail}</p>}
      </div>
    </div>
  );
}
