import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { createEvent, getEvent, joinEvent, saveAdminToken, saveSession } from '../api/client';
import { Button, Card, Input, LogoMark } from '../wl';
import { TASTING_ACCENT, accentVar } from '../accent';
import { useT } from '../useT';

export default function Home() {
  const navigate = useNavigate();
  const { t } = useT();

  // Create flow
  const [createName, setCreateName] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Join flow
  const [joinCode, setJoinCode] = useState('');
  const [joinUsername, setJoinUsername] = useState('');
  const [joinEvent_, setJoinEvent_] = useState<{ name: string; code: string } | null>(null);
  const [joining, setJoining] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [joinError, setJoinError] = useState('');

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!createName.trim() || createPassword.length < 6) return;
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
              placeholder={t('home.passwordPlaceholder')}
              minLength={6}
              autoComplete="new-password"
              required
            />
            <p className="text-xs text-ink-muted">{t('home.passwordHint')}</p>
            {createError && <p className="text-xs text-danger-strong">{createError}</p>}
            <Button
              type="submit"
              variant="accent"
              accent={TASTING_ACCENT}
              full
              disabled={creating || !createName.trim() || createPassword.length < 6}
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
    </div>
  );
}
