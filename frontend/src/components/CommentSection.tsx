import { useState, FormEvent } from 'react';
import { Comment } from '../types';

interface Props {
  comments: Comment[];
  onSubmit?: (text: string) => Promise<void>;
  canComment: boolean;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function CommentSection({ comments, onSubmit, canComment }: Props) {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim() || !onSubmit) return;
    setSubmitting(true);
    try {
      await onSubmit(text.trim());
      setText('');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-stone-700 text-lg">Comments</h3>

      {comments.length === 0 ? (
        <p className="text-stone-400 text-sm italic">No comments yet.</p>
      ) : (
        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
          {comments.map((c) => (
            <div key={c.id} className="bg-stone-100 rounded-lg px-4 py-3">
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <span className="font-medium text-stone-800 text-sm">{c.username}</span>
                <span className="text-stone-400 text-xs whitespace-nowrap">{formatTime(c.createdAt)}</span>
              </div>
              <p className="text-stone-700 text-sm">{c.text}</p>
            </div>
          ))}
        </div>
      )}

      {canComment && onSubmit && (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a comment..."
            maxLength={500}
            className="flex-1 border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
          />
          <button
            type="submit"
            disabled={submitting || !text.trim()}
            className="bg-rose-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-rose-800 disabled:opacity-50 transition-colors"
          >
            Send
          </button>
        </form>
      )}
    </div>
  );
}
