'use client';

import Link from 'next/link';
import { BottomNav } from '@/components/layout/BottomNav';
import {
  ArrowLeft,
  Building2,
  Zap,
  CheckCircle2,
  Circle,
  ExternalLink,
} from 'lucide-react';

export default function ConnectPage() {
  return (
    <div className="flex flex-col min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 glass-strong px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-1" aria-label="Назад">
            <ArrowLeft className="w-5 h-5 text-sg-text-secondary" />
          </Link>
          <h1 className="text-lg font-semibold">Подключение</h1>
        </div>
      </header>

      <div className="flex-1 px-4 space-y-4 animate-fade-in">
        {/* Logo */}
        <div className="flex flex-col items-center py-6">
          <div className="w-16 h-16 rounded-2xl bg-sg-purple flex items-center justify-center mb-3">
            <span className="text-3xl font-bold text-white">S</span>
          </div>
          <h2 className="text-xl font-semibold text-sg-text-primary">SerkoGram</h2>
          <p className="text-sm text-sg-text-secondary mt-1">Подключите Telegram</p>
        </div>

        {/* Business Connection */}
        <div className="bg-sg-surface rounded-2xl p-5 border border-sg-border">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-sg-purple-glow flex items-center justify-center flex-shrink-0">
              <Building2 className="w-5 h-5 text-sg-purple" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-medium text-sg-text-primary">
                Telegram Business
              </h3>
              <p className="text-xs text-sg-text-secondary mt-1">
                Подключение через Telegram Business API. Автоматическое сохранение сообщений из подключённых чатов.
              </p>

              <div className="mt-3 space-y-2">
                <PermissionItem label="Чтение сообщений" granted />
                <PermissionItem label="Получение удалений" granted />
                <PermissionItem label="Работа с выбранными чатами" granted />
              </div>

              <div className="mt-4 space-y-2">
                <p className="text-xs text-sg-text-muted">Как подключить:</p>
                <ol className="text-xs text-sg-text-secondary space-y-1.5">
                  <li className="flex gap-2">
                    <span className="text-sg-purple font-medium">1.</span>
                    Откройте Telegram → Настройки
                  </li>
                  <li className="flex gap-2">
                    <span className="text-sg-purple font-medium">2.</span>
                    Telegram Business → Чат-боты
                  </li>
                  <li className="flex gap-2">
                    <span className="text-sg-purple font-medium">3.</span>
                    Найдите и выберите SerkoGram
                  </li>
                  <li className="flex gap-2">
                    <span className="text-sg-purple font-medium">4.</span>
                    Настройте разрешения и чаты
                  </li>
                </ol>
              </div>

              <a
                href="https://t.me/BotFather"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-sg-purple text-white text-sm font-medium hover:bg-sg-purple-dark transition-colors"
              >
                Подключить
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>

        {/* Chat Automation */}
        <div className="bg-sg-surface rounded-2xl p-5 border border-sg-border">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-sg-surface-2 flex items-center justify-center flex-shrink-0">
              <Zap className="w-5 h-5 text-sg-text-muted" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-medium text-sg-text-primary">
                Chat Automation
              </h3>
              <p className="text-xs text-sg-text-secondary mt-1">
                Автоматизация через поддерживаемый Telegram механизм. Расширенные возможности будут добавлены по мере появления официальной поддержки.
              </p>

              <div className="mt-3 space-y-2">
                <PermissionItem label="Чтение сообщений" granted={false} />
                <PermissionItem label="Получение удалений" granted={false} />
                <PermissionItem label="Автоматизация" granted={false} />
              </div>

              <div className="mt-4 py-2.5 rounded-xl bg-sg-surface-2 text-center">
                <span className="text-xs text-sg-text-muted">Скоро</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

function PermissionItem({
  label,
  granted,
}: {
  label: string;
  granted: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      {granted ? (
        <CheckCircle2 className="w-3.5 h-3.5 text-sg-success" />
      ) : (
        <Circle className="w-3.5 h-3.5 text-sg-text-muted" />
      )}
      <span
        className={`text-xs ${
          granted ? 'text-sg-text-secondary' : 'text-sg-text-muted'
        }`}
      >
        {label}
      </span>
    </div>
  );
}
