import { useEffect, useState, useRef, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getEventStatus, addTastingItem, setActiveItem, postComment, hasAdminToken } from '../api/client';
import { EventStatus, TastingItem } from '../types';
import StarRating from '../components/StarRating';
import CommentSection from '../components/CommentSection';

const POLL_INTERVAL = 3000;

export default function AdminEvent() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  const [status, setStatus] = useState<EventStatus | null>(null);
  const [error, setError] = useState('');

  // Add item form
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [addingItem, setAddingItem] = useState(false);
  const [addItemError, setAddItemError] = useState('');

  const [activating, setActivating] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!code || !hasAdminToken(code)) {
      navigate('/');
      return;
    }

    fetchStatus();
    pollRef.current = setInterval(fetchStatus, POLL_INTERVAL);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [code]);

  async function fetchStatus() {
    if (!code) return;
    try {
      const data = await getEventStatus(code);
      setStatus(data);
    } catch {
      setError('Could not load event status.');
    }
  }

  async function handleAddItem(e: FormEvent) {
    e.preventDefault();
    if (!code || !itemName.trim()) return;
    const price = parseFloat(itemPrice);
    if (isNaN(price) || price < 0) {
      setAddItemError('Enter a valid price.');
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
      setAddItemError('Failed to add item.');
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

  async function handleComment(text: string) {
    if (!code) return;
    await postComment(code, text);
    await fetchStatus();
  }

  function copyCode() {
    navigator.clipboard.writeText(code ?? '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600">{error}</p>
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

  const { event, participants, activeItem, ratingProgress, items, comments } = status;

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-rose-50 p-4 pb-10">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-md p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-medium text-rose-600 uppercase tracking-wider mb-1">Admin View</div>
              <h1 className="text-2xl font-bold text-stone-800">{event.name}</h1>
            </div>
            <button
              onClick={copyCode}
              className="flex items-center gap-2 bg-stone-100 hover:bg-stone-200 transition-colors rounded-xl px-4 py-2 text-sm font-mono font-bold tracking-widest text-stone-700"
              title="Copy event code"
            >
              {event.code}
              <span className="text-xs font-sans font-normal text-stone-400">{copied ? '✓ Copied' : 'Copy'}</span>
            </button>
          </div>
          <p className="mt-3 text-sm text-stone-500">
            Share the code above so participants can join at the app.
          </p>
        </div>

        {/* Participants */}
        <div className="bg-white rounded-2xl shadow-md p-6">
          <h2 className="font-semibold text-stone-700 mb-3">
            Participants
            <span className="ml-2 bg-rose-100 text-rose-700 text-xs font-bold px-2 py-0.5 rounded-full">
              {participants.length}
            </span>
          </h2>
          {participants.length === 0 ? (
            <p className="text-stone-400 text-sm italic">No one has joined yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {participants.map((p) => (
                <span key={p.id} className="bg-stone-100 text-stone-700 text-sm px-3 py-1 rounded-full">
                  {p.username}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Active item progress */}
        {activeItem && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-xs font-medium text-rose-500 uppercase tracking-wider">Now Tasting</div>
                <h2 className="text-xl font-bold text-rose-900">{activeItem.name}</h2>
                <p className="text-rose-700 font-medium">€{activeItem.price.toFixed(2)}</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-rose-700">{ratingProgress.rated}</div>
                <div className="text-sm text-rose-500">of {ratingProgress.total} rated</div>
              </div>
            </div>
            <div className="bg-rose-200 rounded-full h-2">
              <div
                className="bg-rose-600 h-2 rounded-full transition-all duration-500"
                style={{ width: ratingProgress.total > 0 ? `${(ratingProgress.rated / ratingProgress.total) * 100}%` : '0%' }}
              />
            </div>
            {/* Per-participant rating detail */}
            {items.find(i => i.id === activeItem.id)?.ratings && (
              <div className="mt-4 space-y-1">
                {items.find(i => i.id === activeItem.id)!.ratings!.map(r => (
                  <div key={r.username} className="flex items-center justify-between text-sm">
                    <span className="text-rose-800">{r.username}</span>
                    <StarRating value={r.score} disabled size="sm" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Add tasting item */}
        <div className="bg-white rounded-2xl shadow-md p-6">
          <h2 className="font-semibold text-stone-700 mb-4">Add Tasting Item</h2>
          <form onSubmit={handleAddItem} className="flex gap-2 flex-wrap">
            <input
              type="text"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="Name (e.g. Château Margaux 2018)"
              maxLength={100}
              required
              className="flex-1 min-w-40 border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
            />
            <input
              type="number"
              value={itemPrice}
              onChange={(e) => setItemPrice(e.target.value)}
              placeholder="Price (€)"
              min="0"
              step="0.01"
              required
              className="w-28 border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
            />
            <button
              type="submit"
              disabled={addingItem || !itemName.trim() || !itemPrice}
              className="bg-rose-700 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-rose-800 disabled:opacity-50 transition-colors"
            >
              {addingItem ? 'Adding…' : 'Add'}
            </button>
          </form>
          {addItemError && <p className="text-red-600 text-xs mt-2">{addItemError}</p>}
        </div>

        {/* Tasting items list */}
        {items.length > 0 && (
          <div className="bg-white rounded-2xl shadow-md p-6">
            <h2 className="font-semibold text-stone-700 mb-4">Tasting Items</h2>
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 rounded-xl p-3 transition-colors ${
                    item.isActive ? 'bg-rose-50 border border-rose-200' : 'bg-stone-50'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-stone-800 truncate">{item.name}</div>
                    <div className="text-sm text-stone-500">
                      €{item.price.toFixed(2)}
                      {item.avgScore !== null && (
                        <span className="ml-2 text-amber-600 font-medium">
                          ★ {item.avgScore.toFixed(1)} ({item.ratingsCount})
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleActivate(item)}
                    disabled={activating === item.id}
                    className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                      item.isActive
                        ? 'bg-rose-600 text-white hover:bg-rose-700'
                        : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
                    }`}
                  >
                    {item.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Comments */}
        <div className="bg-white rounded-2xl shadow-md p-6">
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
