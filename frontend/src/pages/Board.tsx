import { useParams } from 'react-router-dom';
import QRCode from 'react-qr-code';
import ResultsOverview from '../components/ResultsOverview';
import { LogoMark, ProgressBar } from '../wl';
import { TASTING_ACCENT, accentVar } from '../accent';
import { useT } from '../useT';
import { useEventStatus } from '../useEventStatus';

/**
 * Public, chrome-free display for a screen in the room: the item being tasted,
 * its comments as they come in, and a big QR code to join. Read-only — it uses
 * the anonymous status endpoint, so nothing here needs a login.
 */
export default function Board() {
  const code = useParams<{ code: string }>().code?.toUpperCase();
  const { t, tp, formatPrice, formatTime } = useT();
  const { status, notFound, connectionLost } = useEventStatus(code);

  if (notFound || !status)
    return (
      <div className="flex h-screen items-center justify-center bg-bg text-2xl text-ink-muted">
        {notFound ? t('event.loadError') : connectionLost ? t('common.reconnecting') : t('common.loading')}
      </div>
    );

  const { event, activeItem, items, ratingProgress, participantCount } = status;
  const joinUrl = `${window.location.origin}/event/${event.code}`;
  const active = activeItem ? items.find((i) => i.id === activeItem.id) : null;
  const revealed = !!event.resultsRevealed;
  const comments = active ? [...active.comments].reverse() : [];
  const progressPct = ratingProgress.total > 0 ? (ratingProgress.rated / ratingProgress.total) * 100 : 0;

  return (
    <div className="grid h-screen grid-cols-[minmax(0,1fr)_minmax(0,26rem)] gap-8 overflow-hidden bg-bg p-8 text-ink xl:gap-12 xl:p-12">
      {/* Main: the current tasting */}
      <main className="flex min-h-0 flex-col">
        <header className="flex items-center gap-4">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-card"
            style={{ backgroundColor: accentVar('soft') }}
          >
            <LogoMark size={30} accent={TASTING_ACCENT} />
          </div>
          <div>
            <h1 className="text-3xl font-bold">{event.name}</h1>
            <p className="text-lg text-ink-muted">{tp('admin.participantCount', participantCount)}</p>
          </div>
          {connectionLost && (
            <p role="status" className="ml-auto text-lg text-danger-strong">
              {t('common.reconnecting')}
            </p>
          )}
        </header>

        {revealed ? (
          <div className="mt-8 min-h-0 flex-1 overflow-hidden">
            <ResultsOverview items={items} />
          </div>
        ) : active ? (
          <div className="flex flex-1 flex-col justify-center">
            <p className="text-xl font-medium uppercase tracking-widest text-ink-muted">
              {t('admin.nowTasting')} ·{' '}
              {t('board.itemOf', { n: items.indexOf(active) + 1, total: items.length })}
            </p>
            <h2 className="mt-4 text-6xl font-black leading-tight xl:text-8xl">{active.name}</h2>
            <p className="mt-4 text-4xl font-semibold" style={{ color: accentVar('strong') }}>
              {formatPrice(active.price)}
            </p>
            <div className="mt-12 max-w-2xl">
              <p className="mb-3 text-2xl text-ink-muted">
                {t('event.ratedOfPeople', { rated: ratingProgress.rated, total: ratingProgress.total })}
              </p>
              <ProgressBar value={progressPct} accent={TASTING_ACCENT} className="!h-3" />
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <div className="text-8xl">🍷</div>
            <p className="mt-6 text-4xl font-semibold">{t('board.waiting')}</p>
            <p className="mt-3 text-2xl text-ink-muted">{t('board.scanToJoin')}</p>
          </div>
        )}
      </main>

      {/* Right column: live comments, then the QR code in the bottom-right corner */}
      <aside className="flex min-h-0 flex-col gap-6">
        <div className="min-h-0 flex-1 overflow-hidden">
          {active && !revealed && (
            <>
              <h3 className="mb-4 text-lg font-semibold uppercase tracking-wider text-ink-muted">
                {t('comments.title')}
              </h3>
              {comments.length === 0 ? (
                <p className="text-xl italic text-ink-muted">{t('comments.empty')}</p>
              ) : (
                <ul className="space-y-3">
                  {comments.map((c) => (
                    <li key={c.id} className="rounded-card border border-border bg-surface px-5 py-4">
                      <div className="mb-1 flex items-baseline justify-between gap-3">
                        <span className="text-lg font-semibold" style={{ color: accentVar('strong') }}>
                          {c.username}
                        </span>
                        <span className="text-sm text-ink-muted">{formatTime(c.createdAt)}</span>
                      </div>
                      <p className="text-xl leading-snug">{c.text}</p>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

        {/* White frame with dark modules in both themes — see AdminEvent for why. */}
        <div className="self-end text-center">
          <div className="rounded-card border border-border bg-white p-5">
            <QRCode value={joinUrl} size={280} fgColor="#242427" bgColor="#ffffff" />
          </div>
          <p className="mt-3 font-mono text-4xl font-black tracking-[0.25em]">{event.code}</p>
        </div>
      </aside>
    </div>
  );
}
