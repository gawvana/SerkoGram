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
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-sg-bg/85 backdrop-blur-md border-t border-sg-border/40 pb-safe-bottom z-50 transition-colors"
    >
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
              className={`group flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all duration-200 ${
                tab.isCenter ? 'relative' : ''
              } ${
                isActive
                  ? 'text-sg-purple font-medium'
                  : 'text-sg-text-muted hover:text-sg-text-secondary active:scale-95'
              }`}
            >
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
                  tab.isCenter && isActive
                    ? 'bg-sg-purple/15 text-sg-purple'
                    : tab.isCenter
                    ? 'bg-sg-surface text-sg-text-secondary group-hover:text-sg-purple'
                    : ''
                }`}
              >
                <Icon
                  size={tab.isCenter ? 19 : 18}
                  strokeWidth={isActive ? 2.2 : 1.8}
                  className="transition-transform duration-150 group-hover:scale-105"
                />
              </div>
              <span
                className={`text-[10px] tracking-tight mt-0.5 leading-none ${
                  isActive ? 'font-medium text-sg-purple' : 'text-sg-text-muted'
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