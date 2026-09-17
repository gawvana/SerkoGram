'use client';

import { useState, useMemo } from 'react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import {
  COMMANDS_REGISTRY,
  COMMAND_CATEGORIES,
  CommandDefinition,
  CommandCategory,
} from '@/lib/telegram/commands';
import {
  Search,
  X,
  ChevronRight,
  Terminal,
  Sparkles,
  Info,
  Archive,
  Gamepad2,
  Image as ImageIcon,
  Smile,
  Languages,
  Radio,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
  Clock,
  Wrench,
} from 'lucide-react';
import Link from 'next/link';

export default function CommandsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPrefix, setSelectedPrefix] = useState<'all' | '.' | '/'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeCommand, setActiveCommand] = useState<CommandDefinition | null>(null);
  const [copied, setCopied] = useState(false);

  // Filter commands by prefix, search query and category
  const filteredCommands = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return COMMANDS_REGISTRY.filter((cmd) => {
      const matchesPrefix =
        selectedPrefix === 'all' ||
        cmd.prefix === selectedPrefix ||
        cmd.prefix === '.|/';

      const matchesCategory =
        selectedCategory === 'all' || cmd.category === selectedCategory;

      const matchesSearch =
        !q ||
        cmd.command.toLowerCase().includes(q) ||
        cmd.title.toLowerCase().includes(q) ||
        cmd.description.toLowerCase().includes(q) ||
        cmd.usage.toLowerCase().includes(q);

      return matchesPrefix && matchesCategory && matchesSearch;
    });
  }, [searchQuery, selectedPrefix, selectedCategory]);

  const handleCopyUsage = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getCategoryIcon = (category: CommandCategory) => {
    switch (category) {
      case 'main':
        return Sparkles;
      case 'info':
        return Info;
      case 'archive':
        return Archive;
      case 'games':
        return Gamepad2;
      case 'translation':
        return Languages;
      case 'media':
        return ImageIcon;
      case 'fun':
        return Smile;
      case 'automation':
        return Clock;
      case 'mirror':
        return Radio;
      case 'utility':
        return Wrench;
      default:
        return Terminal;
    }
  };

  return (
    <div className="min-h-screen bg-sg-bg text-sg-text-primary pb-24">
      <Header title="Команды" showBack={true} />

      <main className="max-w-lg mx-auto px-4 pt-3 space-y-4">
        {/* Subtitle / Intro */}
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-sg-text-primary">
            Каталог возможностей
          </h2>
          <p className="text-xs text-sg-text-muted leading-relaxed">
            Все поддерживаемые команды SerkoGram в чате бота и в подключённых чатах Telegram Business.
          </p>
        </div>

        {/* Prefix Segmented Filter */}
        <div className="flex bg-sg-surface p-1 rounded-xl border border-sg-border/60 text-xs font-medium">
          <button
            type="button"
            onClick={() => setSelectedPrefix('all')}
            className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
              selectedPrefix === 'all'
                ? 'bg-emerald-500 text-white shadow-sm font-semibold'
                : 'text-sg-text-secondary hover:text-sg-text-primary'
            }`}
          >
            Все ({COMMANDS_REGISTRY.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedPrefix('.')}
            className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
              selectedPrefix === '.'
                ? 'bg-emerald-500 text-white shadow-sm font-semibold'
                : 'text-sg-text-secondary hover:text-sg-text-primary'
            }`}
          >
            Точечные (.) чаты
          </button>
          <button
            type="button"
            onClick={() => setSelectedPrefix('/')}
            className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
              selectedPrefix === '/'
                ? 'bg-emerald-500 text-white shadow-sm font-semibold'
                : 'text-sg-text-secondary hover:text-sg-text-primary'
            }`}
          >
            Бот (/) команды
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sg-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по командам или описанию..."
            className="w-full bg-sg-surface border border-sg-border/60 rounded-xl pl-9 pr-9 py-2.5 text-sm text-sg-text-primary placeholder:text-sg-text-muted focus:outline-none focus:border-emerald-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-sg-text-muted hover:text-sg-text-primary"
              aria-label="Очистить"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Horizontal Filter Chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar -mx-4 px-4">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all ${
              selectedCategory === 'all'
                ? 'bg-emerald-500 text-white font-medium shadow-sm'
                : 'bg-sg-surface border border-sg-border/40 text-sg-text-secondary hover:text-sg-text-primary'
            }`}
          >
            Все категории
          </button>
          {COMMAND_CATEGORIES.map((cat) => {
            const count = COMMANDS_REGISTRY.filter((c) => {
              const prefixMatches =
                selectedPrefix === 'all' ||
                c.prefix === selectedPrefix ||
                c.prefix === '.|/';
              return prefixMatches && c.category === cat.id;
            }).length;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-emerald-500 text-white font-medium shadow-sm'
                    : 'bg-sg-surface border border-sg-border/40 text-sg-text-secondary hover:text-sg-text-primary'
                }`}
              >
                <span>{cat.name}</span>
                <span className="opacity-70 text-[10px]">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Commands List (Telegram Settings Style) */}
        {filteredCommands.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-sg-surface flex items-center justify-center mx-auto text-sg-text-muted">
              <Search className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-sg-text-secondary">Ничего не найдено</p>
            <p className="text-xs text-sg-text-muted">
              По запросу «{searchQuery}» команд не обнаружено.
            </p>
          </div>
        ) : (
          <div className="bg-sg-surface border border-sg-border/60 rounded-2xl divide-y divide-sg-border/40 overflow-hidden shadow-sm">
            {filteredCommands.map((cmd) => {
              const Icon = getCategoryIcon(cmd.category);
              const prefixLabel = cmd.prefix === '.' ? `.${cmd.command}` : cmd.prefix === '/' ? `/${cmd.command}` : `.${cmd.command}`;
              const contextBadge = cmd.prefix === '.' ? 'Чат' : cmd.prefix === '/' ? 'Бот' : 'Чат/Бот';

              return (
                <button
                  key={cmd.id}
                  onClick={() => setActiveCommand(cmd)}
                  className="w-full text-left px-3.5 py-3 flex items-center justify-between hover:bg-sg-surface-2 transition-colors active:bg-sg-surface-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div className="w-8 h-8 rounded-lg bg-sg-surface-2 flex items-center justify-center text-emerald-400 shrink-0 group-hover:scale-105 transition-transform">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                          {prefixLabel}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-sg-surface-2 text-sg-text-muted">
                          {contextBadge}
                        </span>
                        <span className="text-sm font-medium text-sg-text-primary truncate">
                          {cmd.title}
                        </span>
                      </div>
                      <p className="text-xs text-sg-text-muted truncate mt-0.5">
                        {cmd.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {cmd.enabled ? (
                      <span className="inline-flex items-center text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full font-medium">
                        Активна
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full font-medium">
                        Отключена
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 text-sg-text-muted group-hover:text-sg-text-secondary transition-colors" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>

      {/* Command Detail Modal / Bottom Sheet */}
      {activeCommand && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div
            className="w-full max-w-md bg-sg-surface border border-sg-border rounded-t-3xl sm:rounded-2xl p-5 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-mono font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-md">
                    {activeCommand.prefix === '.' ? `.${activeCommand.command}` : activeCommand.prefix === '/' ? `/${activeCommand.command}` : `.${activeCommand.command}`}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-sg-surface-2 text-sg-text-secondary font-medium">
                    {activeCommand.prefix === '.' ? 'В любых чатах' : activeCommand.prefix === '/' ? 'В чате с ботом' : 'В чатах и боте'}
                  </span>
                  <span className="text-base font-semibold text-sg-text-primary">
                    {activeCommand.title}
                  </span>
                </div>
                <p className="text-xs text-sg-text-muted">
                  {COMMAND_CATEGORIES.find((c) => c.id === activeCommand.category)?.name}
                </p>
              </div>
              <button
                onClick={() => setActiveCommand(null)}
                className="p-1 rounded-lg text-sg-text-muted hover:text-sg-text-primary hover:bg-sg-surface-2 transition-colors"
                aria-label="Закрыть"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Description */}
            <div className="text-xs text-sg-text-secondary leading-relaxed bg-sg-surface-2/60 p-3 rounded-xl border border-sg-border/40">
              {activeCommand.description}
            </div>

            {/* Usage Box */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-sg-text-muted uppercase tracking-wider">
                Использование
              </label>
              <div className="flex items-center justify-between bg-sg-bg border border-sg-border/60 rounded-xl px-3 py-2">
                <code className="text-xs font-mono text-sg-text-primary">
                  {activeCommand.usage}
                </code>
                <button
                  onClick={() => handleCopyUsage(activeCommand.usage)}
                  className="p-1 text-sg-text-muted hover:text-emerald-400 transition-colors"
                  title="Копировать команду"
                  aria-label="Копировать команду"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Example */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-sg-text-muted uppercase tracking-wider">
                Пример
              </label>
              <div className="bg-sg-bg border border-sg-border/60 rounded-xl px-3 py-2 text-xs font-mono text-sg-text-muted">
                {activeCommand.example}
              </div>
            </div>

            {/* Requirements & Status */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-sg-surface-2 border border-sg-border/40 space-y-1">
                <span className="text-[10px] text-sg-text-muted block">Статус функции</span>
                <div className="flex items-center gap-1.5">
                  {activeCommand.enabled ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="font-medium text-emerald-400">Доступна</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                      <span className="font-medium text-amber-400">Отключена</span>
                    </>
                  )}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-sg-surface-2 border border-sg-border/40 space-y-1">
                <span className="text-[10px] text-sg-text-muted block">В ответ на сообщение</span>
                <span className="font-medium text-sg-text-primary">
                  {activeCommand.requiresReply ? 'Обязательно' : 'Не требуется'}
                </span>
              </div>
            </div>

            {/* Disabled explanation if not enabled */}
            {!activeCommand.enabled && activeCommand.disabledReason && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 space-y-1">
                <div className="font-medium flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Функция пока недоступна
                </div>
                <p className="text-[11px] opacity-90">{activeCommand.disabledReason}</p>
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 flex gap-2">
              {activeCommand.enabled && activeCommand.uiRoute ? (
                <Link
                  href={activeCommand.uiRoute}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                >
                  <span>Открыть раздел</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              ) : null}
              <button
                onClick={() => setActiveCommand(null)}
                className="flex-1 bg-sg-surface-2 hover:bg-sg-surface-3 text-sg-text-secondary text-xs font-medium py-2.5 rounded-xl transition-colors"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}