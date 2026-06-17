import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { createEvent, getEvent, joinEvent, saveAdminToken, saveSession } from '../api/client';

export default function Home() {
  const navigate = useNavigate();

  // Create flow
  const [createName, setCreateName] = useState('');
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
    if (!createName.trim()) return;
    setCreating(true);
    setCreateError('');
    try {
      const { event, adminToken } = await createEvent(createName.trim());
      saveAdminToken(event.code, adminToken);
      navigate(`/admin/${event.code}`);
    } catch {
      setCreateError('Failed to create event. Please try again.');
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
      setJoinError('Event not found. Check the code and try again.');
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
      setJoinError(msg ?? 'Failed to join. That username may already be taken.');
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-rose-50 flex flex-col items-center justify-center p-4">
      <header className="text-center mb-10">
        <div className="text-6xl mb-3">🍷</div>
        <h1 className="text-4xl font-bold text-rose-800 tracking-tight">TasteTogether</h1>
        <p className="text-stone-500 mt-2">Collaborative tasting — rate, comment, and enjoy together.</p>
      </header>

      <div className="grid md:grid-cols-2 gap-6 w-full max-w-2xl">
        {/* Create Event */}
        <div className="bg-white rounded-2xl shadow-md p-6">
          <h2 className="text-lg font-semibold text-stone-800 mb-4">Host a Tasting</h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <input
              type="text"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="Event name (e.g. Wine Night #3)"
              maxLength={80}
              required
              className="w-full border border-stone-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
            />
            {createError && <p className="text-red-600 text-xs">{createError}</p>}
            <button
              type="submit"
              disabled={creating || !createName.trim()}
              className="w-full bg-rose-700 text-white font-medium py-2.5 rounded-lg hover:bg-rose-800 disabled:opacity-50 transition-colors"
            >
              {creating ? 'Creating…' : 'Create Event'}
            </button>
          </form>
        </div>

        {/* Join Event */}
        <div className="bg-white rounded-2xl shadow-md p-6">
          <h2 className="text-lg font-semibold text-stone-800 mb-4">Join a Tasting</h2>

          {!joinEvent_ ? (
            <form onSubmit={handleLookup} className="space-y-3">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Event code (e.g. HK3PQ7)"
                maxLength={6}
                required
                className="w-full border border-stone-300 rounded-lg px-3 py-2.5 text-sm font-mono tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-rose-300"
              />
              {joinError && <p className="text-red-600 text-xs">{joinError}</p>}
              <button
                type="submit"
                disabled={lookingUp || joinCode.trim().length < 6}
                className="w-full bg-stone-700 text-white font-medium py-2.5 rounded-lg hover:bg-stone-800 disabled:opacity-50 transition-colors"
              >
                {lookingUp ? 'Looking up…' : 'Find Event'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoin} className="space-y-3">
              <div className="bg-rose-50 rounded-lg px-3 py-2 text-sm">
                <span className="text-stone-500">Joining: </span>
                <span className="font-semibold text-rose-800">{joinEvent_.name}</span>
              </div>
              <input
                type="text"
                value={joinUsername}
                onChange={(e) => setJoinUsername(e.target.value)}
                placeholder="Your name"
                maxLength={40}
                required
                autoFocus
                className="w-full border border-stone-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
              />
              {joinError && <p className="text-red-600 text-xs">{joinError}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setJoinEvent_(null); setJoinError(''); }}
                  className="flex-1 border border-stone-300 text-stone-600 font-medium py-2.5 rounded-lg hover:bg-stone-50 transition-colors text-sm"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={joining || !joinUsername.trim()}
                  className="flex-1 bg-rose-700 text-white font-medium py-2.5 rounded-lg hover:bg-rose-800 disabled:opacity-50 transition-colors text-sm"
                >
                  {joining ? 'Joining…' : 'Join'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
