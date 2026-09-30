import { useSyncExternalStore } from 'react';

/**
 * React port of @wagnerluca/ui's useLocale.js — same `wl-locale` storage key,
 * same navigator.language fallback, same de-first default, so language follows
 * a visitor across Wagner Luca modules exactly as the theme does.
 *
 * As in the original, `t()` here covers only the *chrome* strings this layer
 * renders itself (the two toggle aria-labels). This app's page copy lives in
 * `src/i18n.ts` and is read through `useT()`, which reads the same locale value
 * — one toggle in TopNav switches everything at once.
 */
export type Locale = 'de' | 'en';

const STORAGE_KEY = 'wl-locale';

/** Mirrors DICTIONARY in the design system's useLocale.js. */
const DICTIONARY: Record<string, Record<Locale, string>> = {
  toggleTheme: { de: 'Farbschema wechseln', en: 'Switch color scheme' },
  toggleLocale: { de: 'Sprache wechseln', en: 'Switch language' },
};

const listeners = new Set<() => void>();

function readStored(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'de' || stored === 'en') return stored;
  } catch {
    /* fall through to the browser hint */
  }
  return navigator.language?.toLowerCase().startsWith('en') ? 'en' : 'de';
}

let locale: Locale = readStored();

function apply(value: Locale): void {
  document.documentElement.lang = value;
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* private mode — still applied for this session */
  }
}

function emit(): void {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useLocale() {
  const current = useSyncExternalStore(
    subscribe,
    () => locale,
    () => locale
  );

  function setLocale(value: Locale): void {
    locale = value;
    apply(value);
    emit();
  }

  return {
    locale: current,
    /** Writes the resolved locale onto <html lang>. Call once on mount. */
    init: () => setLocale(readStored()),
    toggle: () => setLocale(locale === 'de' ? 'en' : 'de'),
    setLocale,
    t: (key: string) => DICTIONARY[key]?.[current] ?? key,
  };
}
