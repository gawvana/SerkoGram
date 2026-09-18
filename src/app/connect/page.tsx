'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { BottomNav } from '@/components/layout/BottomNav';
import { useTelegramContext } from '@/providers/TelegramProvider';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Clock,
  KeyRound,
  Bot,
  AlertTriangle,
  FolderArchive,
  RotateCcw,
} from 'lucide-react';

type ConnectionUiState =
  | 'not_connected'
  | 'waiting'
  | 'connected'
  | 'disconnected'
  | 'permission_problem';

interface StateContent {
  title: string;
  description: string;
  cta: string;
}

const ONBOARDING_I18N: Record<
  'ru' | 'en' | 'uz',
  Record<ConnectionUiState, StateContent>
> = {
  ru: {
    not_connected: {
      title: 'Подключение чат-автоматизации',
      description:
        'SerkoGram подключается к вашему Telegram как доверенный чат-бот для автоматизации, архивации и защиты сообщений.',
      cta: 'Подключить через Telegram',
    },
    waiting: {
      title: 'Ожидание подтверждения в Telegram...',
      description:
        'Откройте Telegram → Настройки → Telegram Business → Чат-боты, выберите @{botUsername} и включите бота.',
      cta: 'Проверить статус',
    },
    connected: {
      title: 'Чат-автоматизация активна ✅',
      description:
        'Бот подключён к вашим чатам. Сообщения и медиа сохраняются в архив.',
      cta: 'Открыть архив',
    },
    disconnected: {
      title: 'Подключение отключено',
      description:
        'Чат-бот был отключён в настройках Telegram. Для возобновления архивации подключите бота повторно.',
      cta: 'Подключить повторно',
    },
    permission_problem: {
      title: 'Требуются дополнительные разрешения ⚠️',
      description:
        'Бот подключён, но не может выполнять все функции. Предоставьте недостающие права в Telegram.',
      cta: 'Настроить права в Telegram',
    },
  },
  en: {
    not_connected: {
      title: 'Chat Automation Connection',
      description:
        'SerkoGram connects to your Telegram as a trusted chat bot for automation, archiving, and message protection.',
      cta: 'Connect via Telegram',
    },
    waiting: {
      title: 'Waiting for confirmation in Telegram...',
      description:
        'Open Telegram → Settings → Telegram Business → Chatbots, select @{botUsername} and enable the bot.',
      cta: 'Check Status',
    },
    connected: {
      title: 'Chat Automation Active ✅',
      description:
        'Bot is connected to your chats. Messages and media are saved to the archive.',
      cta: 'Open Archive',
    },
    disconnected: {
      title: 'Connection Disconnected',
      description:
        'Chat bot was disconnected in Telegram settings. To resume archiving, reconnect the bot.',
      cta: 'Reconnect',
    },
    permission_problem: {
      title: 'Additional Permissions Required ⚠️',
      description:
        'Bot is connected, but cannot perform all functions. Grant the missing rights in Telegram.',
      cta: 'Configure Permissions in Telegram',
    },
  },
  uz: {
    not_connected: {
      title: 'Chat avtomatizatsiyasini ulash',
      description:
        'SerkoGram avtomatlashtirish, arxivlash va xabarlarni himoyalash uchun ishonchli bot sifatida Telegramingizga ulanadi.',
      cta: 'Telegram orqali ulash',
    },
    waiting: {
      title: 'Telegramda tasdiqlash kutilmoqda...',
      description:
        "Telegram → Sozlamalar → Telegram Business → Chat-botlar bo'limini oching, @{botUsername} ni tanlang va botni yoqing.",
      cta: 'Holatni tekshirish',
    },
    connected: {
      title: 'Chat avtomatizatsiyasi faol ✅',
      description:
        'Bot chatlaringizga ulandi. Xabarlar va media arxivga saqlanmoqda.',
      cta: 'Arxivni ochish',
    },
    disconnected: {
      title: 'Ulanish uzildi',
      description:
        "Chat-bot Telegram sozlamalarida o'chirildi. Arxivlashni davom ettirish uchun botni qayta ulang.",
      cta: 'Qayta ulash',
    },
    permission_problem: {
      title: "Qo'shimcha ruxsatlar talab qilinadi ⚠️",
      description:
        'Bot ulandi, ammo barcha funksiyalarni bajara olmaydi. Telegramda yetishmayotgan huquqlarni bering.',
      cta: 'Telegramda huquqlarni sozlash',
    },
  },
};

const PERMISSION_LABELS: Record<
  'can_read_messages' | 'can_reply' | 'can_delete_sent_messages' | 'can_delete_all_messages',
  Record<'ru' | 'en' | 'uz', string>
> = {
  can_read_messages: {
    ru: 'Чтение входящих сообщений (can_read_messages)',
    en: 'Read incoming messages (can_read_messages)',
    uz: "Kiruvchi xabarlarni o'qish (can_read_messages)",
  },
  can_reply: {
    ru: 'Отправка ответов (can_reply)',
    en: 'Send replies (can_reply)',
    uz: 'Javoblarni yuborish (can_reply)',
  },
  can_delete_sent_messages: {
    ru: 'Удаление собственных сообщений бота (can_delete_sent_messages)',
    en: 'Delete sent messages (can_delete_sent_messages)',
    uz: "Yuborilgan xabarlarni o'chirish (can_delete_sent_messages)",
  },
  can_delete_all_messages: {
    ru: 'Удаление чужих сообщений (can_delete_all_messages)',
    en: 'Delete all messages (can_delete_all_messages)',
    uz: "Barcha xabarlarni o'chirish (can_delete_all_messages)",
  },
};

export default function ConnectPage() {
  const { webApp, initData } = useTelegramContext();

  const [connection, setConnection] = useState<any>(null);
  const [botUsername, setBotUsername] = useState<string>('SerkoGram_bot');
  const [connectUrls, setConnectUrls] = useState<Record<string, string>>({
    bot: 'https://t.me/SerkoGram_bot',
    businessSettings: 'tg://settings/business',
    connect: 'https://t.me/SerkoGram_bot?start=connect',
  });

  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  // Language resolution
  const userLang: 'ru' | 'en' | 'uz' = useMemo(() => {
    const raw = (webApp?.initDataUnsafe?.user?.language_code || 'ru').toLowerCase();
    if (raw.startsWith('uz')) return 'uz';
    if (raw.startsWith('en')) return 'en';
    return 'ru';
  }, [webApp]);

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
            list.find(
              (c: any) =>
                (c.status === 'CONNECTED' || c.status === 'ACTIVE') && c.isEnabled
            ) ||
            list[0] ||
            null;

          setConnection(active);

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

  useEffect(() => {
    fetchConnection();
  }, [fetchConnection]);

  // Derive permissions
  const permissions = useMemo(() => {
    const rights = connection?.rights || {};
    const canReply = Boolean(connection?.canReply ?? rights.can_reply);
    const canRead = Boolean(connection?.canReadMessages ?? rights.can_read_messages ?? true);
    const canDeleteSent = Boolean(
      connection?.canDeleteSentMessages ??
        rights.can_delete_sent_messages ??
        rights.can_delete_outgoing_messages ??
        true
    );
    const canDeleteAll = Boolean(
      connection?.canDeleteAllMessages ?? rights.can_delete_all_messages ?? false
    );

    return {
      can_read_messages: canRead,
      can_reply: canReply,
      can_delete_sent_messages: canDeleteSent,
      can_delete_all_messages: canDeleteAll,
    };
  }, [connection]);

  // Derive the 5 canonical UI states (§7.2)
  const currentState: ConnectionUiState = useMemo(() => {
    if (!connection) {
      return 'not_connected';
    }

    if (!connection.isEnabled || connection.status === 'DISCONNECTED') {
      return 'disconnected';
    }

    if (connection.status === 'WAITING_FOR_EVENT') {
      return 'waiting';
    }

    const isConnected =
      (connection.status === 'CONNECTED' || connection.status === 'ACTIVE') &&
      connection.isEnabled;

    if (isConnected) {
      if (!permissions.can_read_messages || !permissions.can_reply) {
        return 'permission_problem';
      }
      return 'connected';
    }

    return 'waiting';
  }, [connection, permissions]);

  // Auto-polling for WAITING state
  useEffect(() => {
    if (currentState === 'connected') return;

    const timer = setInterval(() => {
      fetchConnection(false);
    }, 2500);

    return () => clearInterval(timer);
  }, [fetchConnection, currentState]);

  // Window focus listener for fast return from Telegram settings
  useEffect(() => {
    const handleFocus = () => fetchConnection(false);
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchConnection]);

  const strings = ONBOARDING_I18N[userLang][currentState];
  const descriptionText = strings.description.replace('{botUsername}', botUsername);

  // Missing permissions list for permission_problem state
  const missingPermissions = useMemo(() => {
    const list: ('can_read_messages' | 'can_reply' | 'can_delete_sent_messages' | 'can_delete_all_messages')[] = [];
    if (!permissions.can_read_messages) list.push('can_read_messages');
    if (!permissions.can_reply) list.push('can_reply');
    return list;
  }, [permissions]);

  return (
    <div className="flex flex-col min-h-screen pb-24 bg-[#09090b] text-zinc-100">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-[#09090b]/80 backdrop-blur-xl border-b border-white/[0.08] px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
              aria-label="Назад"
            >
              <ArrowLeft className="w-5 h-5 text-zinc-400" />
            </Link>
            <div>
              <h1 className="text-base font-semibold text-white">Чат-автоматизация</h1>
              <p className="text-2xs text-zinc-400">Telegram Bot API 10.3 Integration</p>
            </div>
          </div>

          <button
            onClick={() => fetchConnection(true)}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 text-xs font-medium border border-white/[0.06] transition-all active:scale-95 disabled:opacity-50"
            title="Проверить статус"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                isRefreshing ? 'animate-spin text-emerald-400' : 'text-zinc-400'
              }`}
            />
            <span className="hidden sm:inline">Обновить</span>
          </button>
        </div>
      </header>

      <div className="flex-1 px-4 py-4 space-y-4 max-w-lg mx-auto w-full animate-fade-in">
        {/* Main State Card */}
        <div
          className={`p-5 rounded-2xl border transition-all ${
            currentState === 'connected'
              ? 'bg-emerald-950/20 border-emerald-500/30 shadow-[0_0_24px_rgba(16,185,129,0.12)]'
              : currentState === 'permission_problem'
              ? 'bg-amber-950/20 border-amber-500/30 shadow-[0_0_24px_rgba(245,158,11,0.12)]'
              : currentState === 'disconnected'
              ? 'bg-rose-950/15 border-rose-500/20'
              : 'bg-[#111114] border-white/[0.08]'
          }`}
        >
          <div className="flex items-start gap-3.5">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${
                currentState === 'connected'
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : currentState === 'permission_problem'
                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                  : currentState === 'disconnected'
                  ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                  : 'bg-zinc-800 text-zinc-300 border-white/[0.08]'
              }`}
            >
              {currentState === 'connected' ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : currentState === 'permission_problem' ? (
                <AlertTriangle className="w-5 h-5" />
              ) : currentState === 'disconnected' ? (
                <RotateCcw className="w-5 h-5" />
              ) : (
                <Bot className="w-5 h-5" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold text-white leading-snug">
                {strings.title}
              </h2>
              <p className="text-xs text-zinc-300 mt-1.5 leading-relaxed">
                {descriptionText}
              </p>

              {/* In permission_problem state: explicitly list missing rights (§7.2, state 5) */}
              {currentState === 'permission_problem' && missingPermissions.length > 0 && (
                <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1.5">
                  <p className="text-[11px] font-semibold text-amber-300">
                    Недостающие разрешения:
                  </p>
                  <ul className="text-xs text-amber-200/90 space-y-1">
                    {missingPermissions.map((rightKey) => (
                      <li key={rightKey} className="flex items-center gap-1.5">
                        <XCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                        <span>{PERMISSION_LABELS[rightKey][userLang]}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Button */}
              <div className="mt-4">
                {currentState === 'connected' ? (
                  <Link
                    href="/archive"
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold shadow-[0_0_20px_rgba(16,185,129,0.25)] transition-all active:scale-[0.98]"
                  >
                    <FolderArchive className="w-4 h-4" />
                    <span>{strings.cta}</span>
                  </Link>
                ) : currentState === 'waiting' ? (
                  <button
                    onClick={() => fetchConnection(true)}
                    disabled={isRefreshing}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 text-xs font-semibold shadow-[0_0_20px_rgba(245,158,11,0.2)] transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span>{strings.cta}</span>
                  </button>
                ) : (
                  <a
                    href={
                      currentState === 'permission_problem'
                        ? connectUrls.businessSettings || 'tg://settings/business'
                        : connectUrls.connect || `https://t.me/${botUsername}?start=connect`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold shadow-[0_0_20px_rgba(16,185,129,0.25)] transition-all active:scale-[0.98]"
                  >
                    <span>{strings.cta}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Permissions & Status Badges (§7.2, state 3 & 5) */}
        <div className="bg-[#111114] rounded-2xl p-4 border border-white/[0.08] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Разрешения бота в чатах
            </h3>
            <span className="text-[10px] text-zinc-500 font-mono">Telegram Bot API</span>
          </div>

          <div className="space-y-2">
            <PermissionBadge
              title={PERMISSION_LABELS.can_read_messages[userLang]}
              granted={permissions.can_read_messages}
            />
            <PermissionBadge
              title={PERMISSION_LABELS.can_reply[userLang]}
              granted={permissions.can_reply}
            />
            <PermissionBadge
              title={PERMISSION_LABELS.can_delete_sent_messages[userLang]}
              granted={permissions.can_delete_sent_messages}
            />
            <PermissionBadge
              title={PERMISSION_LABELS.can_delete_all_messages[userLang]}
              granted={permissions.can_delete_all_messages}
            />
          </div>

          {connection?.telegramConnectionId && (
            <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-2xs text-zinc-500 font-mono">
              <span className="flex items-center gap-1">
                <KeyRound className="w-3 h-3" />
                ID: {connection.telegramConnectionId}
              </span>
              {connection.connectedAt && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(connection.connectedAt).toLocaleDateString('ru-RU')}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Security / No Fake State Guarantee */}
        <div className="bg-[#111114] rounded-2xl p-4 border border-white/[0.08] flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <p className="text-2xs text-zinc-400 leading-normal">
            <b>Безопасность SerkoGram:</b> Прямой защищённый протокол Telegram Bot API. Никаких MTProto-сессий, паролей или передачи телефонных номеров. Все статусы верифицируются через Telegram в реальном времени.
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

function PermissionBadge({
  title,
  granted,
}: {
  title: string;
  granted: boolean;
}) {
  return (
    <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-between gap-3">
      <span className="text-xs text-zinc-300">{title}</span>
      {granted ? (
        <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Разрешено</span>
        </span>
      ) : (
        <span className="flex items-center gap-1 text-[11px] text-zinc-500 font-medium px-2 py-0.5 rounded-md bg-zinc-800 border border-white/[0.06]">
          <XCircle className="w-3.5 h-3.5" />
          <span>Отключено</span>
        </span>
      )}
    </div>
  );
}
