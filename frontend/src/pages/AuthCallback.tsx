import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { konto } from '../konto';
import { useT } from '../useT';

/** WL Konto sends the browser back here with a code; trade it for tokens and go on. */
export default function AuthCallback() {
  const navigate = useNavigate();
  const { t } = useT();
  const [failed, setFailed] = useState(false);
  const started = useRef(false); // StrictMode runs effects twice; the code works only once

  useEffect(() => {
    if (started.current || !konto) return;
    started.current = true;
    konto
      .handleCallback()
      .then(({ returnTo }) => navigate(returnTo || '/', { replace: true }))
      .catch(() => setFailed(true));
  }, [navigate]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <p className={failed ? 'text-danger-strong' : 'animate-pulse text-ink-muted'}>
        {failed ? t('konto.callbackFailed') : t('common.loading')}
      </p>
    </div>
  );
}
