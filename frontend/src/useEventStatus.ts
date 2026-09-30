import { useCallback, useEffect, useState } from 'react';
import { getEventStatus } from './api/client';
import { EventStatus } from './types';

const POLL_INTERVAL = 3000;

// Polls the event's live status — the single source of live state for both views.
// A failed poll is just retried on the next tick (`connectionLost` is true meanwhile);
// only a 404 is final, because then the event really doesn't exist.
export function useEventStatus(code: string | undefined, enabled = true) {
  const [status, setStatus] = useState<EventStatus | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [connectionLost, setConnectionLost] = useState(false);

  const refresh = useCallback(async () => {
    if (!code) return;
    try {
      setStatus(await getEventStatus(code));
      setConnectionLost(false);
    } catch (err: unknown) {
      if ((err as { response?: { status?: number } })?.response?.status === 404) setNotFound(true);
      else setConnectionLost(true);
    }
  }, [code]);

  useEffect(() => {
    if (!code || !enabled) return;
    refresh();
    const id = setInterval(refresh, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [code, enabled, refresh]);

  return { status, notFound, connectionLost, refresh };
}
