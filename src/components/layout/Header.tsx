'use client';

import { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTelegramContext } from '@/providers/TelegramProvider';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
}

export function Header({ title, showBack = true, rightAction }: HeaderProps) {
  const router = useRouter();
  const { webApp } = useTelegramContext();

  useEffect(() => {
    if (!webApp?.BackButton) return;

    if (showBack) {
      webApp.BackButton.show();
      const handleBack = () => {
        router.back();
      };
      webApp.BackButton.onClick(handleBack);
      return () => {
        try {
          webApp.BackButton.offClick(handleBack);
          webApp.BackButton.hide();
        } catch {
          // ignore
        }
      };
    } else {
      webApp.BackButton.hide();
    }
  }, [showBack, webApp, router]);

  return (
    <header className="sticky top-0 z-10 glass-strong px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {showBack && (
            <button
              onClick={() => router.back()}
              className="p-1 rounded-lg hover:bg-sg-surface-2 transition-colors"
              aria-label="Назад"
            >
              <ArrowLeft className="w-5 h-5 text-sg-text-secondary" />
            </button>
          )}
          <h1 className="text-lg font-semibold text-sg-text-primary">{title}</h1>
        </div>
        {rightAction && <div>{rightAction}</div>}
      </div>
    </header>
  );
}
