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
    <header className="sticky top-0 z-20 bg-[#0a0a0e]/75 backdrop-blur-2xl border-b border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.3)] px-4 py-3 pt-safe-top transition-colors">
      {/* Bottom hairline highlight */}
      <div className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent pointer-events-none" />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {showBack && (
            <button
              onClick={() => router.back()}
              className="p-1.5 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] active:scale-95 transition-all"
              aria-label="Назад"
            >
              <ArrowLeft className="w-4 h-4 text-zinc-300" />
            </button>
          )}
          <h1 className="text-base font-semibold tracking-tight text-white">{title}</h1>
        </div>
        {rightAction && <div>{rightAction}</div>}
      </div>
    </header>
  );
}
