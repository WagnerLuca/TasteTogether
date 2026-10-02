import { useEffect, useRef, useState } from 'react';
import { useLocale } from './useLocale';
import type { KontoUser } from './konto';

interface Props {
  user: KontoUser | null;
  accountUrl: string;
  accent?: string;
  onSignIn: () => void;
  onSignOut: () => void;
}

const LABELS = {
  signIn: { de: 'Anmelden', en: 'Sign in' },
  signOut: { de: 'Abmelden', en: 'Sign out' },
  myAccount: { de: 'Mein Konto', en: 'My account' },
  accountMenu: { de: 'Kontomenü', en: 'Account menu' },
} as const;

/**
 * Port of UserMenu.vue (design system, unreleased). Signed out: a "Sign in" button; signed
 * in: avatar or initials with a small menu — "My account" (WL Konto) and "Sign out".
 * The strings are the package's DICTIONARY entries of the same names.
 */
export default function UserMenu({ user, accountUrl, accent = 'teal', onSignIn, onSignOut }: Props) {
  const { locale } = useLocale();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const t = (k: keyof typeof LABELS) => LABELS[k][locale];

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [open]);

  if (!user)
    return (
      <button type="button" onClick={onSignIn} className="whitespace-nowrap rounded-btn bg-ink px-4 py-2 text-sm font-semibold text-bg">
        {t('signIn')}
      </button>
    );

  const initials =
    user.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?';

  return (
    <div ref={root} className="relative" onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}>
      <button
        type="button"
        aria-label={t('accountMenu')}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-border"
      >
        {user.picture ? (
          <img src={user.picture} alt="" className="h-full w-full object-cover" />
        ) : (
          <span
            className="flex h-full w-full items-center justify-center font-display text-xs font-semibold"
            style={{ backgroundColor: `var(--accent-${accent}-soft)`, color: `var(--accent-${accent}-strong)` }}
          >
            {initials}
          </span>
        )}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-11 z-50 w-64 overflow-hidden rounded-card border border-border bg-surface p-2 shadow-soft">
          <div className="px-3 py-2">
            <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
            {user.email && <p className="truncate text-xs text-ink-muted">{user.email}</p>}
          </div>
          <div className="my-1 h-px bg-border" />
          <a href={accountUrl} role="menuitem" className="block rounded-lg px-3 py-2 text-sm text-ink hover:bg-bg-alt">
            {t('myAccount')} ↗
          </a>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
            className="block w-full rounded-lg px-3 py-2 text-left text-sm text-ink hover:bg-bg-alt"
          >
            {t('signOut')}
          </button>
        </div>
      )}
    </div>
  );
}
