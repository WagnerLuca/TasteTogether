import { useState, FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import QRCode from 'react-qr-code';
import {
  addTastingItem,
  setActiveItem,
  setResultsRevealed,
  hasAdminToken,
  adminLogin,
  removeParticipant,
  reorderItems,
} from '../api/client';
import { Participant, TastingItem } from '../types';
import StarRating from '../components/StarRating';
import CommentSection from '../components/CommentSection';
import ResultsOverview from '../components/ResultsOverview';
import { Badge, Button, Card, Input, ProgressBar } from '../wl';
import { TASTING_ACCENT, accentVar } from '../accent';
import { useT } from '../useT';
import { useEventStatus } from '../useEventStatus';
import { konto, useKontoUser } from '../konto';

export default function AdminEvent() {
  const code = useParams<{ code: string }>().code?.toUpperCase();
  const { t, tp, formatPrice, formatScore } = useT();

  // Host = event token (password login) or the WL Konto account owning the event. A signed-in
  // Konto user is tried first; the status response's isAdmin then says whether they own it.
  const kontoUser = useKontoUser();
  const [authed, setAuthed] = useState(() => !!code && (hasAdminToken(code) || !!kontoUser));
  const [password, setPassword] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');

  const { status, notFound, connectionLost, refresh } = useEventStatus(code, authed);

  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [addingItem, setAddingItem] = useState(false);
  const [addItemError, setAddItemError] = useState('');

  const [activating, setActivating] = useState<string | null>(null);
  const [togglingResults, setTogglingResults] = useState(false);
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [stepping, setStepping] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [removeError, setRemoveError] = useState('');

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
      await refresh();
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
      await refresh();
    } finally {
      setActivating(null);
    }
  }

  async function handleToggleResults(revealed: boolean) {
    if (!code) return;
    setTogglingResults(true);
    try {
      await setResultsRevealed(code, revealed);
      await refresh();
    } finally {
      setTogglingResults(false);
    }
  }

  async function goTo(itemId: string | null) {
    if (!code) return;
    setStepping(true);
    try {
      await setActiveItem(code, itemId);
      await refresh();
    } finally {
      setStepping(false);
    }
  }

  async function handleMove(index: number, dir: -1 | 1) {
    if (!code || !status) return;
    const ids = status.items.map((i) => i.id);
    [ids[index], ids[index + dir]] = [ids[index + dir], ids[index]];
    setReordering(true);
    try {
      await reorderItems(code, ids);
      await refresh();
    } finally {
      setReordering(false);
    }
  }

  async function handleRemove(p: Participant) {
    if (!code || !window.confirm(t('admin.removeConfirm', { name: p.username }))) return;
    setRemoving(p.id);
    setRemoveError('');
    try {
      await removeParticipant(code, p.id);
      await refresh();
    } catch {
      setRemoveError(t('admin.removeError'));
    } finally {
      setRemoving(null);
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

  const notHost = !!status && !status.isAdmin && !!code && !hasAdminToken(code);

  if (!authed || notHost)
    return (
      <div className="mx-auto w-full max-w-sm px-4 py-16">
        <Card>
          <Badge accent={TASTING_ACCENT}>{t('admin.eyebrow')}</Badge>
          <h1 className="mt-3 text-lg font-semibold text-ink">{t('admin.loginTitle')}</h1>
          <p className="mt-1 text-xs text-ink-muted">{notHost ? t('konto.loginHintSignedIn') : t('admin.loginHint')}</p>
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
          {konto && !kontoUser && (
            <Button variant="ghost" full className="mt-3" onClick={() => konto!.login()}>
              {t('konto.loginWithKonto')}
            </Button>
          )}
        </Card>
      </div>
    );

  if (notFound)
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <p className="text-danger-strong">{t('admin.notFound')}</p>
      </div>
    );

  if (!status)
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="animate-pulse text-ink-muted">
          {connectionLost ? t('common.reconnecting') : t('common.loading')}
        </p>
      </div>
    );

  const { event, participants, activeItem, ratingProgress, items } = status;
  const joinUrl = `${window.location.origin}/event/${event.code}`;
  const activeItemData = activeItem ? items.find((i) => i.id === activeItem.id) : null;
  const resultsRevealed = !!event.resultsRevealed;
  const hasRatedItems = items.some((i) => i.avgScore !== null);
  const progressPct =
    ratingProgress.total > 0 ? (ratingProgress.rated / ratingProgress.total) * 100 : 0;

  // Running order: items come sorted by position. With nothing active, "next" is the
  // first item nobody has rated yet — so it resumes where a paused tasting left off.
  const activeIdx = items.findIndex((i) => i.isActive);
  const prevItem = activeIdx > 0 ? items[activeIdx - 1] : null;
  const nextItem =
    activeIdx >= 0
      ? (items[activeIdx + 1] ?? null)
      : (items.find((i) => i.ratingsCount === 0) ?? items[0] ?? null);
  const nothingTastedYet = items.every((i) => i.ratingsCount === 0);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5 px-4 py-8 pb-12">
      {connectionLost && (
        <p role="status" className="text-center text-sm text-danger-strong">
          {t('common.reconnecting')}
        </p>
      )}
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
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(`/board/${event.code}`, '_blank', 'noopener')}
              >
                {t('admin.openBoard')} ↗
              </Button>
              <span className="text-xs text-ink-muted">{t('admin.boardHint')}</span>
            </div>
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
                className="inline-flex items-center gap-1 rounded-full bg-bg-alt py-1 pl-3 pr-1 text-sm text-ink"
              >
                {p.username}
                <button
                  type="button"
                  onClick={() => handleRemove(p)}
                  disabled={removing === p.id}
                  aria-label={t('admin.removeParticipant', { name: p.username })}
                  title={t('admin.removeParticipant', { name: p.username })}
                  className="flex h-5 w-5 items-center justify-center rounded-full leading-none text-ink-muted transition-colors hover:bg-border hover:text-danger-strong disabled:opacity-50"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        {removeError && <p className="mt-2 text-xs text-danger-strong">{removeError}</p>}
      </Card>

      {/* Running order: step through the pre-defined sequence */}
      {items.length > 0 && (
        <Card>
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-semibold text-ink">{t('admin.flowTitle')}</h2>
            {activeIdx >= 0 && (
              <span className="text-sm text-ink-muted">
                {t('board.itemOf', { n: activeIdx + 1, total: items.length })}
              </span>
            )}
          </div>
          {activeIdx < 0 && <p className="mt-1 text-sm text-ink-muted">{t('admin.flowIdle')}</p>}
          <div className="mt-4 flex gap-2">
            <Button
              variant="ghost"
              className="flex-1"
              disabled={!prevItem || stepping}
              onClick={() => prevItem && goTo(prevItem.id)}
            >
              ← {t('admin.back')}
            </Button>
            <Button
              variant="accent"
              accent={TASTING_ACCENT}
              className="flex-1"
              disabled={stepping || (activeIdx < 0 && !nextItem)}
              onClick={() => goTo(nextItem?.id ?? null)}
            >
              {activeIdx < 0
                ? nothingTastedYet
                  ? t('admin.start')
                  : t('admin.resume', { name: nextItem?.name ?? '' })
                : nextItem
                  ? `${t('admin.next')} →`
                  : t('admin.finish')}
            </Button>
          </div>
        </Card>
      )}

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
            {items.map((item, index) => (
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
                  <span className="w-5 shrink-0 text-center text-sm font-semibold text-ink-muted">
                    {index + 1}
                  </span>
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
                  <div className="flex shrink-0 flex-col">
                    {([-1, 1] as const).map((dir) => (
                      <button
                        key={dir}
                        type="button"
                        onClick={() => handleMove(index, dir)}
                        disabled={reordering || !items[index + dir]}
                        aria-label={t(dir < 0 ? 'admin.moveUp' : 'admin.moveDown', { name: item.name })}
                        title={t(dir < 0 ? 'admin.moveUp' : 'admin.moveDown', { name: item.name })}
                        className="rounded px-1.5 text-xs leading-5 text-ink-muted transition-colors hover:bg-border hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent"
                      >
                        {dir < 0 ? '▲' : '▼'}
                      </button>
                    ))}
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
