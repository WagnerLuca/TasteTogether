import { useSyncExternalStore } from 'react';

/**
 * React port of @wagnerluca/ui's useTheme.js.
 *
 * The Vue original keeps a module-level `ref` so every component sees one
 * shared value; the React equivalent is a module-level variable plus
 * useSyncExternalStore, which gives the same "one source, all subscribers
 * re-render" behaviour without a context provider.
 *
 * Storage key and the `.dark` class on <html> are identical to the original —
 * that's what makes the theme carry across Wagner Luca apps on one origin, and
 * what index.html's pre-paint script relies on.
 */
const STORAGE_KEY = 'wl-theme';

const listeners = new Set<() => void>();

function prefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function readStored(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? stored === 'dark' : prefersDark();
  } catch {
    return false;
  }
}

// Seeded from storage rather than `false`: index.html has already applied the
// class before this module loads, so starting at false would render one frame
// with the wrong toggle icon.
let isDark = readStored();

function apply(value: boolean): void {
  document.documentElement.classList.toggle('dark', value);
  try {
    localStorage.setItem(STORAGE_KEY, value ? 'dark' : 'light');
  } catch {
    /* private mode — the class is still applied for this session */
  }
}

function emit(): void {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useTheme() {
  const dark = useSyncExternalStore(
    subscribe,
    () => isDark,
    () => isDark
  );

  function setTheme(value: boolean): void {
    isDark = value;
    apply(value);
    emit();
  }

  return {
    isDark: dark,
    /** Re-asserts the stored choice onto <html>. Safe to call more than once. */
    init: () => setTheme(readStored()),
    toggle: () => setTheme(!isDark),
    setTheme,
  };
}
