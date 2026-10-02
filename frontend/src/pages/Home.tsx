import { useState, useEffect, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createEvent, getEvent, joinEvent, listMyEvents, saveAdminToken, saveSession } from '../api/client';
import { useKontoUser } from '../konto';
import { Button, Card, Input, LogoMark } from '../wl';
import { TASTING_ACCENT, accentVar } from '../accent';
import { useT } from '../useT';

export default function Home() {
  const navigate = useNavigate();
  const { t, formatDate } = useT();
  const kontoUser = useKontoUser();
  const [mine, setMine] = useState<Awaited<ReturnType<typeof listMyEvents>>>([]);

  useEffect(() => {
    if (kontoUser) listMyEvents().then(setMine).catch(() => setMine([]));
    else setMine([]);
  }, [kontoUser]);

  // Create flow
  const [createName, setCreateName] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Signed in with WL Konto: the host owns what they create, so the password is optional.
  const passwordOk = kontoUser ? createPassword.length === 0 || createPassword.length >= 6 : createPassword.length >= 6;

  // Join flow
  const [joinCode, setJoinCode] = useState('');
  const [joinUsername, setJoinUsername] = useState('');
  const [joinEvent_, setJoinEvent_] = useState<{ name: string; code: string } | null>(null);
  const [joining, setJoining] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [joinError, setJoinError] = useState('');

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!createName.trim() || !passwordOk) return;
    setCreating(true);
    setCreateError('');
    try {
      const { event, token } = await createEvent(createName.trim(), createPassword);
      saveAdminToken(event.code, token);
      navigate(`/admin/${event.code}`);
    } catch {
      setCreateError(t('home.createError'));
    } finally {
      setCreating(false);
    }
  }

  async function handleLookup(e: FormEvent) {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    setLookingUp(true);
    setJoinError('');
    setJoinEvent_(null);
    try {
      const event = await getEvent(code);
      setJoinEvent_(event);
      setJoinCode(code);
    } catch {
      setJoinError(t('home.notFound'));
    } finally {
      setLookingUp(false);
    }
  }

  async function handleJoin(e: FormEvent) {
    e.preventDefault();
    if (!joinEvent_ || !joinUsername.trim()) return;
    setJoining(true);
    setJoinError('');
    try {
      const { sessionToken } = await joinEvent(joinEvent_.code, joinUsername.trim());
      saveSession(joinEvent_.code, sessionToken, joinUsername.trim());
      navigate(`/event/${joinEvent_.code}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setJoinError(msg ?? t('home.joinError'));
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col justify-center px-4 py-12 sm:py-16">
      <header className="mb-10 text-center">
        <div
          className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-card text-ink"
          style={{ backgroundColor: accentVar('soft') }}
        >
          <LogoMark size={34} accent={TASTING_ACCENT} />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          <span className="text-ink-muted">WL</span> TasteTogether
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-ink-muted">{t('brand.tagline')}</p>
      </header>

      <div className="grid gap-5 sm:grid-cols-2">
        {/* Create event */}
        <Card>
          <h2 className="text-lg font-semibold text-ink">{t('home.hostTitle')}</h2>
          <p className="mt-1 text-xs text-ink-muted">{t('home.hostHint')}</p>
          <form onSubmit={handleCreate} className="mt-5 space-y-3">
            <Input
              type="text"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder={t('home.eventNamePlaceholder')}
              maxLength={80}
              required
            />
            <Input
              type="password"
              value={createPassword}
              onChange={(e) => setCreatePassword(e.target.value)}
              placeholder={kontoUser ? t('konto.passwordOptional') : t('home.passwordPlaceholder')}
              minLength={6}
              autoComplete="new-password"
              required={!kontoUser}
            />
            <p className="text-xs text-ink-muted">{kontoUser ? t('konto.signedInHint') : t('home.passwordHint')}</p>
            {createError && <p className="text-xs text-danger-strong">{createError}</p>}
            <Button
              type="submit"
              variant="accent"
              accent={TASTING_ACCENT}
              full
              disabled={creating || !createName.trim() || !passwordOk}
            >
              {creating ? t('home.creating') : t('home.create')}
            </Button>
          </form>
        </Card>

        {/* Join event */}
        <Card>
          <h2 className="text-lg font-semibold text-ink">{t('home.joinTitle')}</h2>
          <p className="mt-1 text-xs text-ink-muted">{t('home.joinHint')}</p>

          {!joinEvent_ ? (
            <form onSubmit={handleLookup} className="mt-5 space-y-3">
              <Input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder={t('home.codePlaceholder')}
                maxLength={6}
                required
                className="font-mono uppercase tracking-widest"
              />
              {joinError && <p className="text-xs text-danger-strong">{joinError}</p>}
              <Button type="submit" full disabled={lookingUp || joinCode.trim().length < 6}>
                {lookingUp ? t('home.finding') : t('home.find')}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleJoin} className="mt-5 space-y-3">
              <div
                className="rounded-btn px-3.5 py-2.5 text-sm"
                style={{ backgroundColor: accentVar('soft') }}
              >
                <span className="text-ink-muted">{t('home.joiningPrefix')} </span>
                <span className="font-semibold" style={{ color: accentVar('strong') }}>
                  {joinEvent_.name}
                </span>
              </div>
              <Input
                type="text"
                value={joinUsername}
                onChange={(e) => setJoinUsername(e.target.value)}
                placeholder={t('home.namePlaceholder')}
                maxLength={40}
                required
                autoFocus
              />
              {joinError && <p className="text-xs text-danger-strong">{joinError}</p>}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="flex-1"
                  onClick={() => {
                    setJoinEvent_(null);
                    setJoinError('');
                  }}
                >
                  {t('common.back')}
                </Button>
                <Button
                  type="submit"
                  variant="accent"
                  accent={TASTING_ACCENT}
                  className="flex-1"
                  disabled={joining || !joinUsername.trim()}
                >
                  {joining ? t('home.joining') : t('home.join')}
                </Button>
              </div>
            </form>
          )}
        </Card>
      </div>

      {kontoUser && (
        <Card className="mt-5">
          <h2 className="text-lg font-semibold text-ink">{t('konto.mineTitle')}</h2>
          {mine.length === 0 ? (
            <p className="mt-2 text-sm italic text-ink-muted">{t('konto.mineEmpty')}</p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {mine.map((e) => (
                <li key={e.id}>
                  <Link to={`/admin/${e.code}`} className="-mx-2 flex items-center gap-3 rounded-btn px-2 py-3 hover:bg-bg-alt">
                    <span className="font-mono text-sm font-bold tracking-widest" style={{ color: accentVar('strong') }}>{e.code}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-ink">{e.name}</span>
                      <span className="block text-xs text-ink-muted">
                        {t('konto.mineMeta', { items: e.items, participants: e.participants })} · {formatDate(e.createdAt)}
                        {e.resultsRevealed && ` · ${t('konto.finished')}`}
                      </span>
                    </span>
                    <span aria-hidden="true" className="text-ink-muted">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}
