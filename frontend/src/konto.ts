import { useSyncExternalStore } from 'react';
import { createKontoAuth, type KontoUser } from './wl/konto';

/**
 * Optional sign-in for hosts via WL Konto. Off unless VITE_KONTO_URL is set at build time
 * (dev default: the Konto dev server) — without it the app works exactly as before:
 * event password for hosts, a name for participants.
 */
const authority = import.meta.env.VITE_KONTO_URL ?? (import.meta.env.DEV ? 'http://localhost:5181' : '');

export const konto = authority
  ? createKontoAuth({ authority, clientId: 'tastetogether', scope: 'openid profile email offline_access api:tastetogether' })
  : null;

// useSyncExternalStore needs a stable snapshot: re-read only when Konto reports a change.
let snapshot: KontoUser | null = konto?.user() ?? null;
const subscribe = (fn: () => void) =>
  konto
    ? konto.subscribe((u) => {
        snapshot = u;
        fn();
      })
    : () => {};

/** The signed-in Konto user, or null — re-renders on sign-in/out. */
export function useKontoUser(): KontoUser | null {
  return useSyncExternalStore(subscribe, () => snapshot);
}
