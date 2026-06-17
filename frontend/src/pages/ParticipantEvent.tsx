import { useEffect, useState, useRef, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getEventStatus, joinEvent, rateItem, postComment, saveSession, getStoredUsername } from '../api/client';
import { EventStatus } from '../types';
import StarRating from '../components/StarRating';
import CommentSection from '../components/CommentSection';

const POLL_INTERVAL = 3000;

export default function ParticipantEvent() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  const [status, setStatus] = useState<EventStatus | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Join form (shown if not yet joined)
  const [joinName, setJoinName] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');

  // Rating
  const [selectedScore, setSelectedScore] = useState(0);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratingError, setRatingError] = useState('');

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!code) { navigate('/'); return; }
    const stored = getStoredUsername(code);
    setUsername(stored);
    fetchStatus();
    pollRef.current = setInterval(fetchStatus, POLL_INTERVAL);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [code]);

  // Reset selected score when active item changes
  useEffect(() => {
    setSelectedScore(status?.myRatingForActiveItem ?? 0);
    setRatingError('');
  }, [status?.activeItem?.id]);

  async function fetchStatus() {
    if (!code) return;
    try {
      const data = await getEventStatus(code);
      setStatus(data);
    } catch {
      setError('Could not load event. The code may be invalid.');
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
      setJoinError(msg ?? 'Failed to join. That name may already be taken.');
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
      setRatingError('Failed to submit rating.');
    } finally {
      setSubmittingRating(false);
    }
  }

  async function handleComment(text: string) {
    if (!code) return;
    await postComment(code, text);
    await fetchStatus();
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
        <p className="text-red-600 text-center">{error}</p>
        <button onClick={() => navigate('/')} className="text-rose-700 underline text-sm">
          Go home
        </button>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-stone-400 animate-pulse">Loading…</p>
      </div>
    );
  }

  // Not yet joined — show join form
  if (!username) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 to-rose-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">🍷</div>
            <h1 className="text-xl font-bold text-stone-800">{status.event.name}</h1>
            <p className="text-stone-500 text-sm mt-1">Enter your name to join</p>
          </div>
          <form onSubmit={handleJoin} className="space-y-3">
            <input
              type="text"
              value={joinName}
              onChange={(e) => setJoinName(e.target.value)}
              placeholder="Your name"
              maxLength={40}
              required
              autoFocus
              className="w-full border border-stone-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
            />
            {joinError && <p className="text-red-600 text-xs">{joinError}</p>}
            <button
              type="submit"
              disabled={joining || !joinName.trim()}
              className="w-full bg-rose-700 text-white font-medium py-2.5 rounded-lg hover:bg-rose-800 disabled:opacity-50 transition-colors"
            >
              {joining ? 'Joining…' : 'Join Tasting'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const { event, participantCount, activeItem, ratingProgress, items, comments, hasRatedActiveItem, myRatingForActiveItem } = status;
  const completedItems = items.filter((i) => !i.isActive && i.ratingsCount > 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-rose-50 p-4 pb-10">
      <div className="max-w-lg mx-auto space-y-5">

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-md p-5">
          <h1 className="text-xl font-bold text-stone-800">{event.name}</h1>
          <div className="flex items-center justify-between mt-1 text-sm text-stone-500">
            <span>Hi, <span className="font-medium text-rose-700">{username}</span></span>
            <span>{participantCount} participant{participantCount !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Active item */}
        {activeItem ? (
          <div className="bg-white rounded-2xl shadow-md p-6">
            <div className="text-xs font-medium text-rose-500 uppercase tracking-wider mb-2">Now Tasting</div>
            <h2 className="text-2xl font-bold text-stone-800">{activeItem.name}</h2>
            <p className="text-stone-500 font-medium mt-0.5">€{activeItem.price.toFixed(2)}</p>

            <div className="mt-5">
              {hasRatedActiveItem ? (
                <div className="space-y-2">
                  <p className="text-sm text-stone-500">Your rating:</p>
                  <StarRating value={myRatingForActiveItem ?? 0} disabled />
                  <p className="text-xs text-stone-400">
                    {ratingProgress.rated} of {ratingProgress.total} people have rated
                  </p>
                </div>
              ) : (
                <form onSubmit={handleRate} className="space-y-3">
                  <p className="text-sm text-stone-600 font-medium">Rate this item:</p>
                  <StarRating value={selectedScore} onChange={setSelectedScore} />
                  {ratingError && <p className="text-red-600 text-xs">{ratingError}</p>}
                  <button
                    type="submit"
                    disabled={submittingRating || selectedScore === 0}
                    className="bg-rose-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-rose-800 disabled:opacity-50 transition-colors"
                  >
                    {submittingRating ? 'Submitting…' : 'Submit Rating'}
                  </button>
                </form>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-md p-6 text-center">
            <div className="text-4xl mb-3">⏳</div>
            <p className="text-stone-600 font-medium">Waiting for the host to start the next tasting…</p>
          </div>
        )}

        {/* Previous items */}
        {completedItems.length > 0 && (
          <div className="bg-white rounded-2xl shadow-md p-5">
            <h3 className="font-semibold text-stone-700 mb-3">Tasted So Far</h3>
            <div className="space-y-2">
              {completedItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm py-1.5 border-b border-stone-100 last:border-0">
                  <div>
                    <span className="font-medium text-stone-800">{item.name}</span>
                    <span className="text-stone-400 ml-2">€{item.price.toFixed(2)}</span>
                  </div>
                  {item.avgScore !== null && (
                    <span className="text-amber-600 font-semibold flex items-center gap-1">
                      ★ {item.avgScore.toFixed(1)}
                      <span className="text-stone-400 font-normal text-xs">({item.ratingsCount})</span>
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Comments */}
        <div className="bg-white rounded-2xl shadow-md p-5">
          <CommentSection
            comments={comments}
            onSubmit={handleComment}
            canComment={true}
          />
        </div>
      </div>
    </div>
  );
}
