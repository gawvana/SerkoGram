'use client';

import { Home, Archive, Terminal, HelpCircle, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function BottomNav() {
  const pathname = usePathname();

  const tabs = [
    { name: 'Главная', href: '/', icon: Home },
    { name: 'Архив', href: '/archive', icon: Archive },
    { name: 'Команды', href: '/commands', icon: Terminal, isCenter: true },
    { name: 'FAQ', href: '/faq', icon: HelpCircle },
    { name: 'Поддержка', href: '/support', icon: MessageCircle },
  ];

  return (
    <nav
      aria-label="Основная навигация"
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-[#0a0a0e]/75 backdrop-blur-2xl border-t border-white/[0.08] shadow-[0_-8px_32px_rgba(0,0,0,0.5)] pb-safe-bottom z-50 transition-colors"
    >
      {/* Top hairline light reflection */}
      <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-white/[0.15] to-transparent pointer-events-none" />

      <div className="flex items-center justify-around px-2 py-1.5 h-14">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive =
            tab.href === '/'
              ? pathname === '/'
              : pathname.startsWith(tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`group flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all duration-200 active:scale-[0.94] ${
                tab.isCenter ? 'relative' : ''
              } ${
                isActive
                  ? 'text-sg-purple font-medium'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-200 ${
                  tab.isCenter && isActive
                    ? 'bg-sg-purple/20 text-sg-purple shadow-[0_0_16px_rgba(139,92,246,0.3)] border border-sg-purple/30'
                    : tab.isCenter
                    ? 'bg-white/[0.05] text-zinc-300 border border-white/[0.06] group-hover:bg-white/[0.08] group-hover:text-sg-purple'
                    : isActive
                    ? 'text-sg-purple'
                    : 'group-hover:text-zinc-200'
                }`}
              >
                <Icon
                  size={tab.isCenter ? 18 : 18}
                  strokeWidth={isActive ? 2.2 : 1.8}
                  className="transition-transform duration-150 group-hover:scale-105"
                />
              </div>
              <span
                className={`text-[10px] tracking-tight mt-0.5 leading-none transition-colors ${
                  isActive ? 'font-medium text-sg-purple' : 'text-zinc-400'
                }`}
              >
                {tab.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}