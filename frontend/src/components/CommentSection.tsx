import { useState, FormEvent } from 'react';
import { Comment } from '../types';
import { Button, Input } from '../wl';
import { TASTING_ACCENT } from '../accent';
import { useT } from '../useT';

interface Props {
  comments: Comment[];
  onSubmit?: (text: string) => Promise<void>;
  canComment: boolean;
}

export default function CommentSection({ comments, onSubmit, canComment }: Props) {
  const { t, formatTime } = useT();
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
      <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-muted">
        {t('comments.title')}
      </h3>

      {comments.length === 0 ? (
        <p className="text-sm italic text-ink-muted">{t('comments.empty')}</p>
      ) : (
        <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
          {comments.map((c) => (
            <div key={c.id} className="rounded-btn bg-bg-alt px-4 py-3">
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-ink">{c.username}</span>
                <span className="whitespace-nowrap text-xs text-ink-muted">
                  {formatTime(c.createdAt)}
                </span>
              </div>
              <p className="text-sm text-ink">{c.text}</p>
            </div>
          ))}
        </div>
      )}

      {canComment && onSubmit && (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('comments.placeholder')}
            maxLength={500}
            className="flex-1"
          />
          <Button
            type="submit"
            variant="accent"
            accent={TASTING_ACCENT}
            size="sm"
            disabled={submitting || !text.trim()}
          >
            {t('comments.send')}
          </Button>
        </form>
      )}
    </div>
  );
}
