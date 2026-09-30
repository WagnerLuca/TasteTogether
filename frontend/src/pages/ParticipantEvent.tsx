import { useEffect, useState, useRef, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getEventStatus,
  joinEvent,
  rateItem,
  postComment,
  saveSession,
  getStoredUsername,
} from '../api/client';
import { EventStatus } from '../types';
import StarRating from '../components/StarRating';
import RatingInput from '../components/RatingInput';
import CommentSection from '../components/CommentSection';
import ResultsOverview from '../components/ResultsOverview';
import { Button, Card, Input, LogoMark } from '../wl';
import { TASTING_ACCENT, accentVar } from '../accent';
import { useT } from '../useT';

const POLL_INTERVAL = 3000;

export default function ParticipantEvent() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { t, tp, formatPrice, formatScore } = useT();

  const [status, setStatus] = useState<EventStatus | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [error, setError] = useState('');

  const [joinName, setJoinName] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');

  const [selectedScore, setSelectedScore] = useState(0);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratingError, setRatingError] = useState('');

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!code) {
      navigate('/');
      return;
    }
    setUsername(getStoredUsername(code));
    fetchStatus();
    pollRef.current = setInterval(fetchStatus, POLL_INTERVAL);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  useEffect(() => {
    setSelectedScore(status?.myRatingForActiveItem ?? 0);
    setRatingError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.activeItem?.id]);

  async function fetchStatus() {
    if (!code) return;
    try {
      setStatus(await getEventStatus(code));
    } catch {
      setError(t('event.loadError'));
    }
  }

  async function handleJoin(e: FormEvent) {
    e.preventDefault();
    if (!code || !joinName.trim()) return;
    setJoining(true);
    setJoinError('');
    try {
      const { sessionToken } = await joinEvent(code, joinName.trim());
      saveSession(code, sessionToken, joinName.trim());
      setUsername(joinName.trim());
      await fetchStatus();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setJoinError(msg ?? t('home.joinError'));
    } finally {
      setJoining(false);
    }
  }

  async function handleRate(e: FormEvent) {
    e.preventDefault();
    if (!code || !status?.activeItem || selectedScore === 0) return;
    setSubmittingRating(true);
    setRatingError('');
    try {
      await rateItem(code, status.activeItem.id, selectedScore);
      await fetchStatus();
    } catch {
      setRatingError(t('event.rateError'));
    } finally {
      setSubmittingRating(false);
    }
  }

  async function handleComment(text: string) {
    if (!code || !status?.activeItem) return;
    await postComment(code, status.activeItem.id, text);
    await fetchStatus();
  }

  if (error)
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-4">
        <p className="text-center text-danger-strong">{error}</p>
        <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
          {t('common.goHome')}
        </Button>
      </div>
    );

  if (!status)
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="animate-pulse text-ink-muted">{t('common.loading')}</p>
      </div>
    );

  if (!username)
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4 py-10">
        <Card className="w-full max-w-sm">
          <div className="mb-6 text-center">
            <div
              className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-card text-ink"
              style={{ backgroundColor: accentVar('soft') }}
            >
              <LogoMark size={30} accent={TASTING_ACCENT} />
            </div>
            <h1 className="text-xl font-bold text-ink">{status.event.name}</h1>
            <p className="mt-1 text-sm text-ink-muted">{t('event.joinPrompt')}</p>
          </div>
          <form onSubmit={handleJoin} className="space-y-3">
            <Input
              type="text"
              value={joinName}
              onChange={(e) => setJoinName(e.target.value)}
              placeholder={t('home.namePlaceholder')}
              maxLength={40}
              required
              autoFocus
            />
            {joinError && <p className="text-xs text-danger-strong">{joinError}</p>}
            <Button
              type="submit"
              variant="accent"
              accent={TASTING_ACCENT}
              full
              disabled={joining || !joinName.trim()}
            >
              {joining ? t('home.joining') : t('event.joinCta')}
            </Button>
          </form>
        </Card>
      </div>
    );

  const {
    event,
    participantCount,
    activeItem,
    ratingProgress,
    items,
    hasRatedActiveItem,
    myRatingForActiveItem,
  } = status;
  const activeItemData = activeItem ? items.find((i) => i.id === activeItem.id) : null;
  const completedItems = items.filter((i) => !i.isActive && i.ratingsCount > 0);
  const resultsRevealed = !!event.resultsRevealed;

  return (
    <div className="mx-auto w-full max-w-lg space-y-5 px-4 py-8 pb-12">
      {/* Header */}
      <Card padded={false} className="p-5">
        <h1 className="text-xl font-bold text-ink">{event.name}</h1>
        <div className="mt-1 flex items-center justify-between text-sm text-ink-muted">
          <span>
            {t('event.greeting')}{' '}
            <span className="font-medium" style={{ color: accentVar('strong') }}>
              {username}
            </span>
          </span>
          <span>{tp('admin.participantCount', participantCount)}</span>
        </div>
      </Card>

      {/* Active item — hidden once the host reveals the final results */}
      {!resultsRevealed &&
        (activeItem && activeItemData ? (
          <Card className="space-y-5">
            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-wider text-ink-muted">
                {t('admin.nowTasting')}
              </div>
              <h2 className="text-2xl font-bold text-ink">{activeItem.name}</h2>
              <p className="mt-0.5 font-medium text-ink-muted">{formatPrice(activeItem.price)}</p>
            </div>

            {/* Rating */}
            <div>
              {hasRatedActiveItem ? (
                <div className="space-y-1">
                  <p className="text-sm text-ink-muted">{t('event.yourRating')}</p>
                  <StarRating value={myRatingForActiveItem ?? 0} disabled size="md" />
                  <p className="text-xs text-ink-muted">
                    {t('event.ratedOfPeople', {
                      rated: ratingProgress.rated,
                      total: ratingProgress.total,
                    })}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleRate} className="space-y-5">
                  <p className="text-sm font-medium text-ink">{t('event.rateThis')}</p>
                  <RatingInput value={selectedScore} onChange={setSelectedScore} />
                  {ratingError && <p className="text-xs text-danger-strong">{ratingError}</p>}
                  <Button
                    type="submit"
                    variant="accent"
                    accent={TASTING_ACCENT}
                    className="w-full sm:w-auto"
                    disabled={submittingRating || selectedScore === 0}
                  >
                    {submittingRating ? t('event.submitting') : t('event.submit')}
                  </Button>
                </form>
              )}
            </div>

            {/* Comments for active item */}
            <div className="border-t border-border pt-4">
              <CommentSection
                comments={activeItemData.comments}
                onSubmit={handleComment}
                canComment={true}
              />
            </div>
          </Card>
        ) : (
          <Card className="text-center">
            <div className="mb-3 text-4xl">⏳</div>
            <p className="font-medium text-ink-muted">{t('event.waiting')}</p>
          </Card>
        ))}

      {/* Official results — shown once the host reveals the ranking */}
      {resultsRevealed && <ResultsOverview items={items} />}

      {/* Completed items with per-item comments (hidden once full results are revealed) */}
      {!resultsRevealed && completedItems.length > 0 && (
        <div className="space-y-4">
          <h3 className="px-1 text-sm font-semibold uppercase tracking-wider text-ink-muted">
            {t('event.tastedSoFar')}
          </h3>
          {completedItems.map((item) => (
            <Card key={item.id} padded={false} className="p-5">
              <div className="mb-1 flex items-start justify-between gap-3">
                <div>
                  <span className="font-semibold text-ink">{item.name}</span>
                  <span className="ml-2 text-sm text-ink-muted">{formatPrice(item.price)}</span>
                </div>
                {item.avgScore !== null && (
                  <span
                    className="flex shrink-0 items-center gap-1 font-bold"
                    style={{ color: accentVar('strong') }}
                  >
                    ★ {formatScore(item.avgScore)}
                    <span className="text-xs font-normal text-ink-muted">
                      ({item.ratingsCount})
                    </span>
                  </span>
                )}
              </div>

              {item.comments.length > 0 && (
                <div className="mt-3 border-t border-border pt-3">
                  <CommentSection comments={item.comments} canComment={false} />
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
