'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

interface TelegramContextValue {
  webApp: WebApp | null;
  user: TelegramUser | null;
  initData: string;
  colorScheme: 'light' | 'dark';
  isReady: boolean;
}

// Telegram WebApp SDK types
interface WebApp {
  initData: string;
  initDataUnsafe: { user?: TelegramUser; auth_date: number; hash: string };
  colorScheme: 'light' | 'dark';
  themeParams: Record<string, string>;
  viewportHeight: number;
  viewportStableHeight: number;
  isExpanded: boolean;
  ready: () => void;
  expand: () => void;
  close: () => void;
  enableClosingConfirmation: () => void;
  disableClosingConfirmation: () => void;
  BackButton: {
    isVisible: boolean;
    show: () => void;
    hide: () => void;
    onClick: (fn: () => void) => void;
    offClick: (fn: () => void) => void;
  };
  MainButton: {
    text: string;
    isVisible: boolean;
    isActive: boolean;
    setText: (text: string) => void;
    show: () => void;
    hide: () => void;
    enable: () => void;
    disable: () => void;
    showProgress: (leaveActive?: boolean) => void;
    hideProgress: () => void;
    onClick: (fn: () => void) => void;
    offClick: (fn: () => void) => void;
    setParams: (params: Record<string, unknown>) => void;
  };
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged: () => void;
  };
  openLink: (url: string) => void;
  openTelegramLink: (url: string) => void;
  showAlert: (message: string, callback?: () => void) => void;
  showConfirm: (message: string, callback?: (ok: boolean) => void) => void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: WebApp;
    };
  }
}

const TelegramContext = createContext<TelegramContextValue>({
  webApp: null,
  user: null,
  initData: '',
  colorScheme: 'dark',
  isReady: false,
});

export function TelegramProvider({ children }: { children: ReactNode }) {
  const [webApp, setWebApp] = useState<WebApp | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      tg.enableClosingConfirmation();
      setWebApp(tg);
      setIsReady(true);
      document.body.classList.add('tg-theme');
    } else {
      // Not in Telegram — still mount the app (for dev/browser testing)
      setIsReady(true);
    }
  }, []);

  const value: TelegramContextValue = {
    webApp,
    user: webApp?.initDataUnsafe?.user ?? null,
    initData: webApp?.initData ?? '',
    colorScheme: webApp?.colorScheme ?? 'dark',
    isReady,
  };

  return (
    <TelegramContext.Provider value={value}>{children}</TelegramContext.Provider>
  );
}

export function useTelegramContext() {
  return useContext(TelegramContext);
}
