'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { Send, AlertCircle } from 'lucide-react';

const CATEGORIES = [
  { key: 'BUG', label: 'Ошибка в работе' },
  { key: 'CONNECTION', label: 'Проблема с подключением' },
  { key: 'ARCHIVE', label: 'Вопрос по архиву' },
  { key: 'PAYMENT', label: 'Оплата и подписка' },
  { key: 'SUGGESTION', label: 'Предложение по улучшению' },
  { key: 'OTHER', label: 'Другой вопрос' },
] as const;

export default function NewTicketPage() {
  const router = useRouter();
  const [category, setCategory] = useState<string>('BUG');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, subject, message }),
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Не удалось создать обращение');
      }
      return json.data;
    },
    onSuccess: (data) => {
      router.push(`/support/${data.id}`);
    },
    onError: (err: any) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) {
      setError('Укажите тему обращения');
      return;
    }
    if (!message.trim()) {
      setError('Опишите подробно вашу проблему или вопрос');
      return;
    }
    setError(null);
    mutation.mutate();
  };

  return (
    <main className="flex-1 pb-24 bg-sg-bg text-sg-text-primary">
      <Header title="Новое обращение" showBack />

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        {error && (
          <div className="bg-red-500/15 border border-red-500/30 text-red-400 p-3 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Category */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-sg-text-secondary">Категория</label>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                type="button"
                onClick={() => setCategory(cat.key)}
                className={`py-2 px-3 rounded-xl text-xs font-medium text-left border transition-all ${
                  category === cat.key
                    ? 'bg-sg-purple/20 border-sg-purple text-white'
                    : 'bg-sg-surface border-sg-border text-sg-text-secondary hover:bg-sg-surface-2'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Subject */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-sg-text-secondary">Тема обращения</label>
          <input
            type="text"
            placeholder="Кратко опишите суть вопроса"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full bg-sg-surface rounded-xl px-4 py-2.5 text-sm text-sg-text-primary placeholder:text-sg-text-muted border border-sg-border focus:border-sg-purple focus:outline-none transition-colors"
          />
        </div>

        {/* Message */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-sg-text-secondary">Описание проблемы</label>
          <textarea
            rows={5}
            placeholder="Подробно расскажите, что произошло..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full bg-sg-surface rounded-xl px-4 py-2.5 text-sm text-sg-text-primary placeholder:text-sg-text-muted border border-sg-border focus:border-sg-purple focus:outline-none transition-colors resize-none"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full flex items-center justify-center gap-2 bg-sg-purple hover:bg-sg-purple-dark text-white font-medium py-3 rounded-xl text-sm transition-colors disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          <span>{mutation.isPending ? 'Отправка...' : 'Отправить обращение'}</span>
        </button>
      </form>

      <BottomNav />
    </main>
  );
}
