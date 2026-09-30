import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import LogoLockup from './LogoLockup';
import { useTheme } from './useTheme';
import { useLocale } from './useLocale';

export interface Tab {
  to: string;
  label: string;
}

interface Props {
  tabs?: Tab[];
  /** Logo tab colour — a module app passes its own accent, never the default. */
  accent?: string;
  /** Sub-brand: set -> "WL {product}" instead of the full wordmark. */
  product?: string;
  /** App-specific actions on the right of the toggles (the Vue slot). */
  children?: ReactNode;
}

/**
 * Port of TopNav.vue: sticky translucent header with the logo lockup, an
 * optional tab row (visible from 720px = `sm`, never `md` — see src/wl/README.md)
 * and the shared locale + theme toggles.
 */
export default function TopNav({ tabs = [], accent = 'teal', product = '', children }: Props) {
  const { pathname } = useLocation();
  const { isDark, toggle: toggleTheme } = useTheme();
  const { locale, toggle: toggleLocale, t } = useLocale();

  return (
    <nav
      className="sticky top-0 z-50 flex items-center justify-between gap-3 border-b border-border px-5 py-4 backdrop-blur md:px-10"
      style={{ backgroundColor: 'color-mix(in srgb, var(--color-bg) 85%, transparent)' }}
    >
      <Link to="/">
        <LogoLockup size={26} accent={accent} product={product} />
      </Link>

      {tabs.length > 0 && (
        <div className="hidden gap-1 rounded-xl bg-bg-alt p-1 sm:flex">
          {tabs.map((tab) => {
            const active = pathname === tab.to;
            return (
              <Link
                key={tab.to}
                to={tab.to}
                className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                  active ? 'bg-surface text-ink shadow-soft' : 'text-ink-muted'
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={toggleLocale}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-xs font-semibold uppercase text-ink"
          aria-label={t('toggleLocale')}
        >
          {locale}
        </button>
        <button
          type="button"
          onClick={toggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface"
          aria-label={t('toggleTheme')}
        >
          {isDark ? '☀️' : '🌙'}
        </button>
        {children}
      </div>
    </nav>
  );
}
