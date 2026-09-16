'use client';

import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import {
  Building2,
  Zap,
  ShieldCheck,
  Archive,
  PowerOff,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';

export default function InstructionsPage() {
  return (
    <main className="flex-1 pb-24 bg-sg-bg text-sg-text-primary">
      <Header title="Инструкции" showBack={false} />

      <div className="p-4 space-y-4">
        {/* Intro Banner */}
        <div className="bg-sg-surface p-5 rounded-2xl border border-sg-border shadow-sm">
          <h2 className="text-lg font-semibold text-white mb-1">Как подключить SerkoGram?</h2>
          <p className="text-xs text-sg-text-secondary leading-relaxed">
            Подробное руководство по настройке интеграции и принципам работы персонального архива сообщений.
          </p>
        </div>

        {/* 1. Telegram Business */}
        <div className="bg-sg-surface rounded-2xl p-5 border border-sg-border space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-2xs font-bold text-emerald-400 uppercase tracking-wider">Шаг 1</span>
              <h3 className="text-base font-semibold text-white">Telegram Business</h3>
            </div>
          </div>
          <p className="text-xs text-sg-text-secondary leading-relaxed">
            Это официальный и безопасный способ интеграции, предоставленный Telegram для бизнес-аккаунтов.
          </p>
          <ol className="text-xs text-sg-text-secondary space-y-2 pl-4 list-decimal marker:text-emerald-400">
            <li>Откройте Telegram и перейдите в <b>Настройки</b>.</li>
            <li>Выберите раздел <b>Telegram Business</b> &rarr; <b>Чат-боты</b>.</li>
            <li>В строке поиска найдите нашего бота и добавьте его.</li>
            <li>Укажите, в каких чатах бот может работать (все чаты, только новые или выбранные).</li>
          </ol>
          <Link
            href="/connect"
            className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium hover:underline pt-1"
          >
            Перейти к подключению <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* 2. Chat Automation */}
        <div className="bg-sg-surface rounded-2xl p-5 border border-sg-border space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sg-surface-2 flex items-center justify-center text-sg-text-muted">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <span className="text-2xs font-bold text-sg-text-muted uppercase tracking-wider">Режим 2</span>
              <h3 className="text-base font-semibold text-white">Chat Automation</h3>
            </div>
          </div>
          <p className="text-xs text-sg-text-secondary leading-relaxed">
            Альтернативный механизм автоматизации взаимодействия с чатами через официально поддерживаемый Telegram Bot API. 
            По мере расширения официальных возможностей Telegram, этот режим будет активирован для всех пользователей.
          </p>
        </div>

        {/* 3. Permissions */}
        <div className="bg-sg-surface rounded-2xl p-5 border border-sg-border space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sg-success/20 flex items-center justify-center text-sg-success">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-2xs font-bold text-sg-success uppercase tracking-wider">Безопасность</span>
              <h3 className="text-base font-semibold text-white">Какие разрешения нужны?</h3>
            </div>
          </div>
          <ul className="text-xs text-sg-text-secondary space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-sg-success font-bold">&#10003;</span>
              <span><b>Чтение сообщений</b> — необходимо для моментального создания локальной резервной копии переписки.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-sg-success font-bold">&#10003;</span>
              <span><b>Получение уведомлений об удалении</b> — позволяет зафиксировать факт удаления и сохранить архивную копию.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-sg-text-muted">&#10007;</span>
              <span>SerkoGram <b>не имеет</b> доступа к вашим паролям, сессиям, личным платежным данным или чатам вне списка разрешённых.</span>
            </li>
          </ul>
        </div>

        {/* 4. What is saved */}
        <div className="bg-sg-surface rounded-2xl p-5 border border-sg-border space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <span className="text-2xs font-bold text-emerald-400 uppercase tracking-wider">Архивация</span>
              <h3 className="text-base font-semibold text-white">Что сохраняется?</h3>
            </div>
          </div>
          <p className="text-xs text-sg-text-secondary leading-relaxed">
            Архивируются текстовые сообщения, отредактированные версии, медиафайлы (фотографии, видео, документы, голосовые сообщения и видеозаметки).
            Все данные шифруются и привязываются строго к вашему личному аккаунту.
          </p>
        </div>

        {/* 5. How to disconnect */}
        <div className="bg-sg-surface rounded-2xl p-5 border border-sg-border space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-500/20 flex items-center justify-center text-red-400">
              <PowerOff className="w-5 h-5" />
            </div>
            <div>
              <span className="text-2xs font-bold text-red-400 uppercase tracking-wider">Управление</span>
              <h3 className="text-base font-semibold text-white">Как отключить?</h3>
            </div>
          </div>
          <p className="text-xs text-sg-text-secondary leading-relaxed">
            Вы можете отключить бота в любой момент непосредственно из настроек Telegram:
          </p>
          <ol className="text-xs text-sg-text-secondary space-y-1.5 pl-4 list-decimal marker:text-red-400">
            <li>Перейдите в <b>Telegram Business &rarr; Чат-боты</b>.</li>
            <li>Нажмите на SerkoGram и выберите <b>Отключить</b>.</li>
            <li>После этого приём новых сообщений немедленно прекратится.</li>
          </ol>
          <p className="text-xs text-sg-text-muted mt-2">
            Вы также можете полностью удалить все накопленные данные архива в разделе <b>Настройки &rarr; Приватность</b>.
          </p>
        </div>
      </div>

      <BottomNav />
    </main>
  );
}