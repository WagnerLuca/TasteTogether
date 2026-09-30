import { useEffect, useState, useRef, FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import QRCode from 'react-qr-code';
import {
  getEventStatus,
  addTastingItem,
  setActiveItem,
  setResultsRevealed,
  hasAdminToken,
  adminLogin,
} from '../api/client';
import { EventStatus, TastingItem } from '../types';
import StarRating from '../components/StarRating';
import CommentSection from '../components/CommentSection';
import ResultsOverview from '../components/ResultsOverview';
import { Badge, Button, Card, Input, ProgressBar } from '../wl';
import { TASTING_ACCENT, accentVar } from '../accent';
import { useT } from '../useT';

const POLL_INTERVAL = 3000;

export default function AdminEvent() {
  const { code } = useParams<{ code: string }>();
  const { t, tp, formatPrice, formatScore } = useT();

  const [authed, setAuthed] = useState(() => !!code && hasAdminToken(code));
  const [password, setPassword] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');

  const [status, setStatus] = useState<EventStatus | null>(null);
  const [error, setError] = useState('');

  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [addingItem, setAddingItem] = useState(false);
  const [addItemError, setAddItemError] = useState('');

  const [activating, setActivating] = useState<string | null>(null);
  const [togglingResults, setTogglingResults] = useState(false);
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!code || !authed) return;
    fetchStatus();
    pollRef.current = setInterval(fetchStatus, POLL_INTERVAL);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, authed]);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    if (!code || !password) return;
    setLoggingIn(true);
    setLoginError('');
    try {
      await adminLogin(code, password);
      setAuthed(true);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      setLoginError(t(status === 429 ? 'admin.loginThrottled' : 'admin.loginError'));
    } finally {
      setLoggingIn(false);
    }
  }

  async function fetchStatus() {
    if (!code) return;
    try {
      const data = await getEventStatus(code);
      setStatus(data);
    } catch {
      setError(t('admin.statusError'));
    }
  }

  async function handleAddItem(e: FormEvent) {
    e.preventDefault();
    if (!code || !itemName.trim()) return;
    const price = parseFloat(itemPrice);
    if (isNaN(price) || price < 0) {
      setAddItemError(t('admin.invalidPrice'));
      return;
    }
    setAddingItem(true);
    setAddItemError('');
    try {
      await addTastingItem(code, itemName.trim(), price);
      setItemName('');
      setItemPrice('');
      await fetchStatus();
    } catch {
      setAddItemError(t('admin.addError'));
    } finally {
      setAddingItem(false);
    }
  }

  async function handleActivate(item: TastingItem) {
    if (!code) return;
    setActivating(item.id);
    try {
      await setActiveItem(code, item.isActive ? null : item.id);
      await fetchStatus();
    } finally {
      setActivating(null);
    }
  }

  async function handleToggleResults(revealed: boolean) {
    if (!code) return;
    setTogglingResults(true);
    try {
      await setResultsRevealed(code, revealed);
      await fetchStatus();
    } finally {
      setTogglingResults(false);
    }
  }

  function copyCode() {
    navigator.clipboard.writeText(code ?? '');
    setCopied('code');
    setTimeout(() => setCopied(null), 2000);
  }

  function copyLink() {
    if (!code) return;
    navigator.clipboard.writeText(`${window.location.origin}/event/${code}`);
    setCopied('link');
    setTimeout(() => setCopied(null), 2000);
  }

  if (!authed)
    return (
      <div className="mx-auto w-full max-w-sm px-4 py-16">
        <Card>
          <Badge accent={TASTING_ACCENT}>{t('admin.eyebrow')}</Badge>
          <h1 className="mt-3 text-lg font-semibold text-ink">{t('admin.loginTitle')}</h1>
          <p className="mt-1 text-xs text-ink-muted">{t('admin.loginHint')}</p>
          <form onSubmit={handleLogin} className="mt-5 space-y-3">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('admin.passwordPlaceholder')}
              autoComplete="current-password"
              required
              autoFocus
            />
            {loginError && <p className="text-xs text-danger-strong">{loginError}</p>}
            <Button
              type="submit"
              variant="accent"
              accent={TASTING_ACCENT}
              full
              disabled={loggingIn || !password}
            >
              {loggingIn ? t('admin.loggingIn') : t('admin.login')}
            </Button>
          </form>
        </Card>
      </div>
    );

  if (error)
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <p className="text-danger-strong">{error}</p>
      </div>
    );

  if (!status)
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="animate-pulse text-ink-muted">{t('common.loading')}</p>
      </div>
    );

  const { event, participants, activeItem, ratingProgress, items } = status;
  const joinUrl = `${window.location.origin}/event/${event.code}`;
  const activeItemData = activeItem ? items.find((i) => i.id === activeItem.id) : null;
  const resultsRevealed = !!event.resultsRevealed;
  const hasRatedItems = items.some((i) => i.avgScore !== null);
  const progressPct =
    ratingProgress.total > 0 ? (ratingProgress.rated / ratingProgress.total) * 100 : 0;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5 px-4 py-8 pb-12">
      {/* Header / share card */}
      <Card>
        <Badge accent={TASTING_ACCENT}>{t('admin.eyebrow')}</Badge>
        <h1 className="mb-5 mt-3 text-2xl font-bold text-ink">{event.name}</h1>
        <div className="flex flex-wrap items-center gap-5">
          {/* The QR frame stays white with dark modules in both themes: a code
              rendered in --color-surface on dark would have far too little
              contrast for a phone camera to read. */}
          <div className="shrink-0 rounded-card border border-border bg-white p-3">
            <QRCode value={joinUrl} size={128} fgColor="#242427" bgColor="#ffffff" />
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <p className="mb-1 text-xs uppercase tracking-wider text-ink-muted">
                {t('admin.eventCode')}
              </p>
              <div className="flex items-center gap-2">
                <span className="font-mono text-3xl font-black tracking-[0.25em] text-ink">
                  {event.code}
                </span>
                <Button variant="ghost" size="sm" onClick={copyCode}>
                  {copied === 'code' ? t('common.copied') : t('common.copy')}
                </Button>
              </div>
            </div>
            <div>
              <p className="mb-1 text-xs uppercase tracking-wider text-ink-muted">
                {t('admin.joinLink')}
              </p>
              <div className="flex items-center gap-2">
                <span className="truncate font-mono text-sm text-ink-muted">{joinUrl}</span>
                <Button variant="ghost" size="sm" className="shrink-0" onClick={copyLink}>
                  {copied === 'link' ? t('common.copied') : t('common.copy')}
                </Button>
              </div>
            </div>
            <p className="text-xs text-ink-muted">{t('admin.shareHint')}</p>
          </div>
        </div>
      </Card>

      {/* Participants */}
      <Card>
        <h2 className="mb-3 flex items-center gap-2 font-semibold text-ink">
          {t('admin.participants')}
          <Badge accent={TASTING_ACCENT}>{participants.length}</Badge>
        </h2>
        {participants.length === 0 ? (
          <p className="text-sm italic text-ink-muted">{t('admin.noParticipants')}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {participants.map((p) => (
              <span
                key={p.id}
                className="rounded-full bg-bg-alt px-3 py-1 text-sm text-ink"
              >
                {p.username}
              </span>
            ))}
          </div>
        )}
      </Card>

      {/* Active item */}
      {activeItem && activeItemData && (
        <Card accent={TASTING_ACCENT} className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-medium uppercase tracking-wider text-ink-muted">
                {t('admin.nowTasting')}
              </div>
              <h2 className="text-xl font-bold text-ink">{activeItem.name}</h2>
              <p className="font-medium" style={{ color: accentVar('strong') }}>
                {formatPrice(activeItem.price)}
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold" style={{ color: accentVar('strong') }}>
                {ratingProgress.rated}
              </div>
              <div className="text-sm text-ink-muted">
                {t('admin.ratedOf', { total: ratingProgress.total })}
              </div>
            </div>
          </div>

          <ProgressBar value={progressPct} accent={TASTING_ACCENT} />

          {activeItemData.ratings && activeItemData.ratings.length > 0 && (
            <div className="space-y-1">
              {activeItemData.ratings.map((r) => (
                <div key={r.username} className="flex items-center justify-between text-sm">
                  <span className="text-ink">{r.username}</span>
                  <StarRating value={r.score} disabled size="sm" />
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-border pt-4">
            <CommentSection comments={activeItemData.comments} canComment={false} />
          </div>
        </Card>
      )}

      {/* Add tasting item */}
      <Card>
        <h2 className="mb-4 font-semibold text-ink">{t('admin.addItem')}</h2>
        <form onSubmit={handleAddItem} className="flex flex-wrap gap-2">
          <Input
            type="text"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            placeholder={t('admin.itemNamePlaceholder')}
            maxLength={100}
            required
            className="min-w-40 flex-1"
          />
          <Input
            type="number"
            value={itemPrice}
            onChange={(e) => setItemPrice(e.target.value)}
            placeholder={t('admin.pricePlaceholder')}
            min="0"
            step="0.01"
            required
            className="w-28"
          />
          <Button
            type="submit"
            variant="accent"
            accent={TASTING_ACCENT}
            size="sm"
            disabled={addingItem || !itemName.trim() || !itemPrice}
          >
            {addingItem ? t('admin.adding') : t('admin.add')}
          </Button>
        </form>
        {addItemError && <p className="mt-2 text-xs text-danger-strong">{addItemError}</p>}
      </Card>

      {/* Tasting items list */}
      {items.length > 0 && (
        <Card>
          <h2 className="mb-4 font-semibold text-ink">{t('admin.items')}</h2>
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-card border p-3 transition-colors"
                style={
                  item.isActive
                    ? { backgroundColor: accentVar('soft'), borderColor: accentVar() }
                    : { backgroundColor: 'var(--color-bg-alt)', borderColor: 'transparent' }
                }
              >
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-ink">{item.name}</div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-ink-muted">
                      <span>{formatPrice(item.price)}</span>
                      {item.avgScore !== null && (
                        <span className="font-medium" style={{ color: accentVar('strong') }}>
                          ★ {formatScore(item.avgScore)} ({item.ratingsCount})
                        </span>
                      )}
                      {item.comments.length > 0 && (
                        <span>💬 {tp('admin.commentCount', item.comments.length)}</span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={item.isActive ? 'accent' : 'ghost'}
                    accent={TASTING_ACCENT}
                    onClick={() => handleActivate(item)}
                    disabled={activating === item.id}
                  >
                    {item.isActive ? t('admin.deactivate') : t('admin.activate')}
                  </Button>
                </div>

                {/* Show comments for completed items inline */}
                {!item.isActive && item.comments.length > 0 && (
                  <div className="mt-3 border-t border-border pt-3">
                    <CommentSection comments={item.comments} canComment={false} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Results reveal control */}
      {hasRatedItems && (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold text-ink">{t('admin.resultsTitle')}</h2>
              <p className="text-sm text-ink-muted">
                {resultsRevealed ? t('admin.resultsVisible') : t('admin.resultsHidden')}
              </p>
            </div>
            <Button
              size="sm"
              variant={resultsRevealed ? 'ghost' : 'accent'}
              accent={TASTING_ACCENT}
              onClick={() => handleToggleResults(!resultsRevealed)}
              disabled={togglingResults}
            >
              {togglingResults
                ? t('common.saving')
                : resultsRevealed
                  ? t('admin.hideResults')
                  : t('admin.reveal')}
            </Button>
          </div>

          <div className="mt-6">
            <ResultsOverview items={items} />
          </div>
        </Card>
      )}
    </div>
  );
}
