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
    <nav className="fixed bottom-0 w-full bg-sg-surface-2/80 backdrop-blur-md border-t border-sg-border pb-safe-bottom flex justify-around p-2 z-50">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = pathname === tab.href;
        return (
          <Link key={tab.href} href={tab.href} className={`flex flex-col items-center p-2 ${isActive ? 'text-sg-purple' : 'text-sg-text-muted'}`}>
            <Icon size={24} />
            <span className="text-[10px] mt-1">{tab.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
