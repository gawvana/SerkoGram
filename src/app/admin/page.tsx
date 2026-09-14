'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import {
  Users,
  MessageSquare,
  Building2,
  Image as ImageIcon,
  LifeBuoy,
  Activity,
  ShieldAlert,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';

interface AdminStats {
  totalUsers: number;
  totalMessages: number;
  activeConnections: number;
  totalMedia: number;
  openTickets: number;
  recentAuditLogs: number;
}

interface AdminData {
  stats: AdminStats;
  system: {
    status: string;
    timestamp: string;
    version: string;
  };
}

export default function AdminDashboardPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'tickets' | 'users' | 'audit'>('tickets');
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Stats query
  const { data: adminData, isLoading: statsLoading, refetch, isRefetching } = useQuery<AdminData>({
    queryKey: ['adminDashboard'],
    queryFn: async () => {
      const res = await fetch('/api/admin/dashboard', { credentials: 'include' });
      const json = await res.json();
      return json.data;
    },
  });

  // Tickets query
  const {
    data: ticketsData,
    isLoading: ticketsLoading,
    isError: ticketsError,
    refetch: refetchTickets,
  } = useQuery({
    queryKey: ['adminTickets'],
    queryFn: async () => {
      const res = await fetch('/api/admin/tickets', { credentials: 'include' });
      const json = await res.json();
      return json.data?.tickets ?? [];
    },
    enabled: activeTab === 'tickets',
  });

  // Users query
  const {
    data: usersData,
    isLoading: usersLoading,
    isError: usersError,
    refetch: refetchUsers,
  } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: async () => {
      const res = await fetch('/api/admin/users', { credentials: 'include' });
      const json = await res.json();
      return json.data?.users ?? [];
    },
    enabled: activeTab === 'users',
  });

  // Audit query
  const {
    data: auditData,
    isLoading: auditLoading,
    isError: auditError,
    refetch: refetchAudit,
  } = useQuery({
    queryKey: ['adminAudit'],
    queryFn: async () => {
      const res = await fetch('/api/admin/audit', { credentials: 'include' });
      const json = await res.json();
      return json.data?.logs ?? [];
    },
    enabled: activeTab === 'audit',
  });

  // Update ticket status mutation
  const updateTicketMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/support/tickets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
        credentials: 'include',
      });
      return res.json();
    },
    onSuccess: () => {
      showToast('Статус тикета обновлён');
      queryClient.invalidateQueries({ queryKey: ['adminTickets'] });
      queryClient.invalidateQueries({ queryKey: ['adminDashboard'] });
    },
    onError: () => {
      showToast('Не удалось обновить статус');
    },
  });

  const stats = adminData?.stats;

  return (
    <main className="flex-1 pb-24 bg-sg-bg text-sg-text-primary">
      <Header
        title="Панель администратора"
        showBack
        rightAction={
          <button
            type="button"
            onClick={() => refetch()}
            className="p-1.5 rounded-lg hover:bg-sg-surface-2 transition-colors text-sg-text-secondary"
            title="Обновить"
          >
            <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
          </button>
        }
      />

      <div className="p-4 space-y-4">
        {/* Toast */}
        {toast && (
          <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-sg-surface border border-sg-purple text-white px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-lg animate-fade-in">
            <CheckCircle2 className="w-3.5 h-3.5 text-sg-purple" />
            <span>{toast}</span>
          </div>
        )}

        {/* System Health */}
        <div className="bg-sg-surface p-4 rounded-2xl border border-sg-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sg-success/20 flex items-center justify-center text-sg-success">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-white">Статус системы</p>
                <span className="w-2 h-2 rounded-full bg-sg-success animate-pulse" />
              </div>
              <p className="text-2xs text-sg-text-muted mt-0.5">
                Версия {adminData?.system?.version ?? '1.0.0'} &bull; Все сервисы активны
              </p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          <StatBox
            icon={<Users className="w-4 h-4 text-sg-purple" />}
            label="Пользователи"
            value={stats?.totalUsers}
            loading={statsLoading}
          />
          <StatBox
            icon={<MessageSquare className="w-4 h-4 text-sg-purple" />}
            label="Сообщения"
            value={stats?.totalMessages}
            loading={statsLoading}
          />
          <StatBox
            icon={<Building2 className="w-4 h-4 text-sg-success" />}
            label="Подключения"
            value={stats?.activeConnections}
            loading={statsLoading}
          />
          <StatBox
            icon={<ImageIcon className="w-4 h-4 text-sg-purple" />}
            label="Медиафайлы"
            value={stats?.totalMedia}
            loading={statsLoading}
          />
          <StatBox
            icon={<LifeBuoy className="w-4 h-4 text-yellow-400" />}
            label="Открытые тикеты"
            value={stats?.openTickets}
            loading={statsLoading}
          />
          <StatBox
            icon={<ShieldAlert className="w-4 h-4 text-sg-purple" />}
            label="Аудит-логи"
            value={stats?.recentAuditLogs}
            loading={statsLoading}
          />
        </div>

        {/* Tab Controls */}
        <div className="flex gap-2 p-1 bg-sg-surface rounded-xl border border-sg-border text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('tickets')}
            className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'tickets'
                ? 'bg-sg-purple text-white'
                : 'text-sg-text-secondary hover:text-white'
            }`}
          >
            Тикеты ({stats?.openTickets ?? 0})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'users'
                ? 'bg-sg-purple text-white'
                : 'text-sg-text-secondary hover:text-white'
            }`}
          >
            Пользователи
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'audit'
                ? 'bg-sg-purple text-white'
                : 'text-sg-text-secondary hover:text-white'
            }`}
          >
            Аудит
          </button>
        </div>

        {/* Tab Content */}
        <div className="space-y-2">
          {activeTab === 'tickets' && (
            <div className="space-y-2">
              {ticketsLoading ? (
                <div className="space-y-2">
                  <div className="h-16 skeleton rounded-xl" />
                  <div className="h-16 skeleton rounded-xl" />
                </div>
              ) : ticketsError ? (
                <div className="p-4 bg-sg-surface rounded-xl border border-sg-border text-center space-y-2">
                  <p className="text-xs text-red-400">Ошибка загрузки тикетов</p>
                  <button
                    type="button"
                    onClick={() => refetchTickets()}
                    className="px-3 py-1.5 bg-sg-surface-2 hover:bg-sg-surface-3 rounded-lg text-2xs text-white"
                  >
                    Повторить
                  </button>
                </div>
              ) : !ticketsData || ticketsData.length === 0 ? (
                <p className="text-center text-xs text-sg-text-muted py-8">Нет обращений</p>
              ) : (
                ticketsData.map((t: any) => (
                  <div
                    key={t.id}
                    className="p-3 bg-sg-surface rounded-xl border border-sg-border space-y-2"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <p className="text-xs font-semibold text-white">{t.subject}</p>
                        <p className="text-2xs text-sg-text-muted">
                          От @{t.user?.username ?? t.user?.firstName ?? 'Пользователь'} &bull; #{t.id.slice(0, 8)}
                        </p>
                      </div>
                      <select
                        value={t.status}
                        onChange={(e) => updateTicketMutation.mutate({ id: t.id, status: e.target.value })}
                        className="text-2xs bg-sg-surface-2 border border-sg-border rounded-lg px-2 py-1 text-sg-text-primary focus:outline-none"
                      >
                        <option value="OPEN">Открыт</option>
                        <option value="IN_PROGRESS">В работе</option>
                        <option value="WAITING_USER">Ожидает</option>
                        <option value="RESOLVED">Решён</option>
                        <option value="CLOSED">Закрыт</option>
                      </select>
                    </div>

                    <div className="flex justify-between items-center text-2xs pt-1 border-t border-sg-border/40">
                      <span className="text-sg-purple">{t.category}</span>
                      <Link
                        href={`/support/${t.id}`}
                        className="text-sg-purple-light hover:underline font-medium"
                      >
                        Открыть диалог &rarr;
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-1.5">
              {usersLoading ? (
                <div className="space-y-1.5">
                  <div className="h-12 skeleton rounded-xl" />
                  <div className="h-12 skeleton rounded-xl" />
                </div>
              ) : usersError ? (
                <div className="p-4 bg-sg-surface rounded-xl border border-sg-border text-center space-y-2">
                  <p className="text-xs text-red-400">Ошибка загрузки пользователей</p>
                  <button
                    type="button"
                    onClick={() => refetchUsers()}
                    className="px-3 py-1.5 bg-sg-surface-2 hover:bg-sg-surface-3 rounded-lg text-2xs text-white"
                  >
                    Повторить
                  </button>
                </div>
              ) : !usersData || usersData.length === 0 ? (
                <p className="text-center text-xs text-sg-text-muted py-8">Пользователи не найдены</p>
              ) : (
                usersData.map((u: any) => (
                  <div
                    key={u.id}
                    className="p-3 bg-sg-surface rounded-xl border border-sg-border flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-medium text-white">
                        {u.firstName} {u.lastName ?? ''}
                        {u.isAdmin && (
                          <span className="ml-1.5 px-1.5 py-0.5 rounded bg-sg-purple/20 text-sg-purple-light text-[10px]">
                            Admin
                          </span>
                        )}
                      </p>
                      <p className="text-2xs text-sg-text-muted">
                        ID: {u.telegramId} &bull; @{u.username ?? 'нет юзернейма'}
                      </p>
                    </div>
                    <span className="text-2xs text-sg-text-muted">
                      {new Date(u.createdAt).toLocaleDateString('ru-RU')}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="space-y-1.5">
              {auditLoading ? (
                <div className="space-y-1.5">
                  <div className="h-12 skeleton rounded-xl" />
                  <div className="h-12 skeleton rounded-xl" />
                </div>
              ) : auditError ? (
                <div className="p-4 bg-sg-surface rounded-xl border border-sg-border text-center space-y-2">
                  <p className="text-xs text-red-400">Ошибка загрузки журнала аудита</p>
                  <button
                    type="button"
                    onClick={() => refetchAudit()}
                    className="px-3 py-1.5 bg-sg-surface-2 hover:bg-sg-surface-3 rounded-lg text-2xs text-white"
                  >
                    Повторить
                  </button>
                </div>
              ) : !auditData || auditData.length === 0 ? (
                <p className="text-center text-xs text-sg-text-muted py-8">Журнал аудита пуст</p>
              ) : (
                auditData.map((log: any) => (
                  <div
                    key={log.id}
                    className="p-2.5 bg-sg-surface rounded-xl border border-sg-border text-xs flex items-center justify-between"
                  >
                    <div>
                      <span className="font-mono text-2xs text-sg-purple-light font-medium">
                        {log.action}
                      </span>
                      <p className="text-[11px] text-sg-text-muted">
                        Пользователь: {log.userId?.slice(0, 8) ?? 'Система'}
                      </p>
                    </div>
                    <span className="text-2xs text-sg-text-muted">
                      {new Date(log.createdAt).toLocaleTimeString('ru-RU')}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </main>
  );
}

function StatBox({
  icon,
  label,
  value,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value?: number;
  loading: boolean;
}) {
  return (
    <div className="bg-sg-surface p-3.5 rounded-2xl border border-sg-border space-y-1">
      <div className="flex items-center gap-1.5">{icon}</div>
      <p className="text-2xs text-sg-text-muted">{label}</p>
      {loading ? (
        <div className="h-6 w-12 skeleton rounded" />
      ) : (
        <p className="text-lg font-bold text-white">{(value ?? 0).toLocaleString('ru-RU')}</p>
      )}
    </div>
  );
}
