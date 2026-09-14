'use client';

import { use, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/layout/Header';
import { Send, RefreshCw, CheckCheck, User, Headphones } from 'lucide-react';

interface SupportMsg {
  id: string;
  isSupport: boolean;
  text: string;
  createdAt: string;
}

interface TicketDetail {
  id: string;
  category: string;
  subject: string;
  status: string;
  createdAt: string;
  messages: SupportMsg[];
}

export default function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const ticketId = resolvedParams.id;
  const queryClient = useQueryClient();
  const [replyText, setReplyText] = useState('');

  const { data: ticket, isLoading, isError, refetch, isRefetching } = useQuery<TicketDetail>({
    queryKey: ['ticket', ticketId],
    queryFn: async () => {
      const res = await fetch(`/api/support/tickets/${ticketId}`, { credentials: 'include' });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Ошибка загрузки');
      return json.data;
    },
  });

  const replyMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await fetch(`/api/support/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        credentials: 'include',
      });
      return res.json();
    },
    onSuccess: () => {
      setReplyText('');
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
    },
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    replyMutation.mutate(replyText);
  };

  return (
    <main className="flex-1 flex flex-col h-screen max-h-screen bg-sg-bg text-sg-text-primary">
      <Header
        title={`Тикет #${ticketId.slice(0, 8)}`}
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

      {/* Ticket summary strip */}
      {ticket && (
        <div className="px-4 py-2.5 bg-sg-surface border-b border-sg-border flex items-center justify-between gap-3 text-xs">
          <div className="min-w-0">
            <p className="font-semibold text-white truncate">{ticket.subject}</p>
            <p className="text-2xs text-sg-text-muted mt-0.5">Категория: {ticket.category}</p>
          </div>
          <span className="text-2xs px-2.5 py-1 rounded-full bg-sg-purple/20 text-sg-purple-light border border-sg-purple/30 font-medium flex-shrink-0">
            {ticket.status}
          </span>
        </div>
      )}

      {/* Message feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="space-y-3 py-6">
            <div className="w-56 h-12 skeleton rounded-2xl" />
            <div className="w-64 h-16 skeleton rounded-2xl ml-auto" />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center h-full py-16 text-center text-sg-text-muted space-y-3">
            <p className="text-sm text-red-400">Не удалось загрузить данные тикета</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="px-4 py-2 bg-sg-surface-2 hover:bg-sg-surface-3 rounded-xl text-xs text-white border border-sg-border transition-colors"
            >
              Повторить попытку
            </button>
          </div>
        ) : !ticket?.messages || ticket.messages.length === 0 ? (
          <p className="text-center text-xs text-sg-text-muted py-10">Нет сообщений</p>
        ) : (
          ticket.messages.map((m) => {
            const isStaff = m.isSupport;
            const time = new Date(m.createdAt).toLocaleTimeString('ru-RU', {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={m.id}
                className={`flex w-full ${isStaff ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 space-y-1 ${
                    isStaff
                      ? 'bg-sg-surface-2 text-white border border-sg-border rounded-bl-sm'
                      : 'bg-sg-purple text-white rounded-br-sm'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-2xs opacity-75 mb-0.5">
                    {isStaff ? (
                      <>
                        <Headphones className="w-3 h-3 text-sg-purple-light" />
                        <span className="font-medium text-sg-purple-light">Поддержка SerkoGram</span>
                      </>
                    ) : (
                      <>
                        <User className="w-3 h-3" />
                        <span>Вы</span>
                      </>
                    )}
                  </div>

                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{m.text}</p>

                  <div className="flex items-center justify-end gap-1 text-[10px] opacity-70 pt-0.5">
                    <span>{time}</span>
                    {!isStaff && <CheckCheck className="w-3 h-3" />}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Reply input */}
      <form
        onSubmit={handleSend}
        className="p-3 bg-sg-surface border-t border-sg-border flex items-center gap-2"
      >
        <input
          type="text"
          placeholder="Напишите ответ..."
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          className="flex-1 bg-sg-surface-2 rounded-xl px-4 py-2.5 text-sm text-sg-text-primary placeholder:text-sg-text-muted border border-sg-border focus:border-sg-purple focus:outline-none transition-colors"
        />
        <button
          type="submit"
          disabled={!replyText.trim() || replyMutation.isPending}
          className="p-2.5 rounded-xl bg-sg-purple hover:bg-sg-purple-dark text-white disabled:opacity-40 transition-colors flex-shrink-0"
          aria-label="Отправить ответ"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </main>
  );
}
