import en from './en';
import bn from './bn';

export type Lang = 'en' | 'bn';

let current: Lang = 'en';
const translations: Record<Lang, Record<string, string>> = { en, bn };

export function setLang(lang: Lang) {
  if (translations[lang]) {
    current = lang;
    document.documentElement.lang = lang;
    try { window.api.i18n.set(lang); } catch {}
    window.dispatchEvent(new CustomEvent('i18n:change', { detail: { lang } }));
  }
}

export function getLang(): Lang {
  return current;
}

export function t(key: string, vars?: Record<string, string | number>): string {
  const str = translations[current]?.[key] || translations.en[key] || key;
  if (!vars) return str;
  return str.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] !== undefined ? String(vars[k]) : '');
}

export function useT() {
  const [, force] = React.useReducer((x) => x + 1, 0);
  React.useEffect(() => {
    const handler = () => force();
    window.addEventListener('i18n:change', handler);
    return () => window.removeEventListener('i18n:change', handler);
  }, []);
  return t;
}

import * as React from 'react';