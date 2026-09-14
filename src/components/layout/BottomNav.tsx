'use client';

import { Home, Archive, BookOpen, HelpCircle, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function BottomNav() {
  const pathname = usePathname();
  const tabs = [
    { name: 'Главная', href: '/', icon: Home },
    { name: 'Архив', href: '/archive', icon: Archive },
    { name: 'Инструкции', href: '/instructions', icon: BookOpen },
    { name: 'FAQ', href: '/faq', icon: HelpCircle },
    { name: 'Поддержка', href: '/support', icon: MessageCircle },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-sg-surface/90 backdrop-blur-lg border-t border-sg-border safe-bottom flex justify-around p-2 z-50 shadow-2xl">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex flex-col items-center py-1.5 px-3 rounded-xl transition-all ${
              isActive ? 'text-sg-purple font-medium scale-105' : 'text-sg-text-muted hover:text-sg-text-secondary'
            }`}
          >
            <Icon size={20} />
            <span className="text-[10px] mt-1 tracking-tight">{tab.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
