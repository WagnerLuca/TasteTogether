import { useState } from 'react';
import { TastingItem } from '../types';
import StarRating from './StarRating';
import CommentSection from './CommentSection';
import { Card } from '../wl';
import { accentVar } from '../accent';
import { useT } from '../useT';

const MEDALS = ['🥇', '🥈', '🥉'];

interface Props {
  items: TastingItem[];
}

/** Sort rated items by score desc (tie-break on number of ratings), unrated last. */
function rankItems(items: TastingItem[]): TastingItem[] {
  return [...items].sort((a, b) => {
    if (a.avgScore === null && b.avgScore === null) return 0;
    if (a.avgScore === null) return 1;
    if (b.avgScore === null) return -1;
    if (b.avgScore !== a.avgScore) return b.avgScore - a.avgScore;
    return b.ratingsCount - a.ratingsCount;
  });
}

function RankingRow({ item, rank }: { item: TastingItem; rank: number }) {
  const { t, tp, formatPrice } = useT();
  const [open, setOpen] = useState(false);
  const medal = rank <= 3 ? MEDALS[rank - 1] : null;

  return (
    <div className="overflow-hidden rounded-card border border-border bg-surface">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-bg-alt"
      >
        <div className="w-10 shrink-0 text-center">
          {medal ? (
            <span className="text-2xl">{medal}</span>
          ) : (
            <span className="text-lg font-bold text-ink-muted">#{rank}</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold text-ink">{item.name}</div>
          <div className="text-sm text-ink-muted">{formatPrice(item.price)}</div>
        </div>

        <div className="shrink-0 text-right">
          {item.avgScore !== null ? (
            <>
              <StarRating value={item.avgScore} size="sm" disabled />
              <div className="mt-0.5 text-xs text-ink-muted">
                {tp('results.ratingCount', item.ratingsCount)}
              </div>
            </>
          ) : (
            <span className="text-xs italic text-ink-muted">{t('common.notRated')}</span>
          )}
        </div>

        <span
          className={`shrink-0 text-ink-muted transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        >
          ▾
        </span>
      </button>

      {open && (
        <div className="border-t border-border px-4 pb-4 pt-3">
          {item.comments.length > 0 ? (
            <CommentSection comments={item.comments} canComment={false} />
          ) : (
            <p className="py-2 text-sm italic text-ink-muted">{t('comments.noneForItem')}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function ResultsOverview({ items }: Props) {
  const { t, formatScore } = useT();
  const ranked = rankItems(items);
  const podium = ranked.filter((i) => i.avgScore !== null).slice(0, 3);

  if (ranked.length === 0) {
    return (
      <Card className="text-center text-sm text-ink-muted">{t('results.noItems')}</Card>
    );
  }

  // Podium display order: 2nd, 1st, 3rd — so the winner sits in the middle and tallest.
  const podiumOrder = [podium[1], podium[0], podium[2]].filter(Boolean);
  const heights = new Map<string, string>();
  if (podium[0]) heights.set(podium[0].id, 'h-28');
  if (podium[1]) heights.set(podium[1].id, 'h-20');
  if (podium[2]) heights.set(podium[2].id, 'h-16');

  return (
    <div className="space-y-6">
      {/* Podium */}
      {podium.length > 0 && (
        <Card>
          <h2 className="mb-6 text-center text-lg font-bold text-ink">🏆 {t('results.title')}</h2>
          <div className="flex items-end justify-center gap-3">
            {podiumOrder.map((item) => {
              const rank = podium.indexOf(item) + 1;
              return (
                <div key={item.id} className="flex max-w-[10rem] flex-1 flex-col items-center">
                  <div className="mb-1 text-3xl">{MEDALS[rank - 1]}</div>
                  <div className="w-full truncate px-1 text-center text-sm font-semibold text-ink">
                    {item.name}
                  </div>
                  <div className="mb-2 text-sm font-bold" style={{ color: accentVar('strong') }}>
                    {formatScore(item.avgScore ?? 0)}
                    <span className="font-normal text-ink-muted">/10</span>
                  </div>
                  {/* The block itself carries the accent; taller = better rank. */}
                  <div
                    className={`flex w-full items-start justify-center rounded-t-btn pt-1 font-black text-on-accent ${heights.get(
                      item.id
                    )}`}
                    style={{
                      background: `linear-gradient(to bottom, ${accentVar()}, ${accentVar('strong')})`,
                    }}
                  >
                    {rank}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Full ranking — every entry, expandable for comments */}
      <div className="space-y-2">
        <h3 className="px-1 text-sm font-semibold uppercase tracking-wider text-ink-muted">
          {t('results.fullRanking')}
        </h3>
        {ranked.map((item, idx) => (
          <RankingRow key={item.id} item={item} rank={idx + 1} />
        ))}
      </div>
    </div>
  );
}
