'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  t,
  SupportedLanguage,
  DEFAULT_LANGUAGE,
  resolveLanguage,
  TranslationKey,
} from '@/lib/i18n';

export function useTranslation() {
  const [language, setLangState] = useState<SupportedLanguage>(DEFAULT_LANGUAGE);

  useEffect(() => {
    // 1. Try saved user language from localStorage
    const saved = localStorage.getItem('serkogram_lang');
    if (saved && (saved === 'ru' || saved === 'uz' || saved === 'en')) {
      setLangState(saved);
      return;
    }

    // 2. Try Telegram WebApp initData language
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.language_code) {
      const tgLang = resolveLanguage((window as any).Telegram.WebApp.initDataUnsafe.user.language_code);
      setLangState(tgLang);
      localStorage.setItem('serkogram_lang', tgLang);
      return;
    }

    // 3. Browser navigator language
    if (typeof navigator !== 'undefined') {
      const navLang = resolveLanguage(navigator.language);
      setLangState(navLang);
    }
  }, []);

  const setLanguage = useCallback((lang: SupportedLanguage) => {
    setLangState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('serkogram_lang', lang);
    }
    // Also persist to server if user is authenticated
    fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ languageCode: lang }),
    }).catch(() => null);
  }, []);

  const translate = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>) => {
      return t(key, language, params);
    },
    [language]
  );

  return {
    t: translate,
    language,
    setLanguage,
  };
}
