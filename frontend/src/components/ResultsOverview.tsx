import { useState } from 'react';
import { TastingItem } from '../types';
import StarRating from './StarRating';
import CommentSection from './CommentSection';

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
  const [open, setOpen] = useState(false);
  const medal = rank <= 3 ? MEDALS[rank - 1] : null;

  return (
    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-stone-50 transition-colors"
      >
        <div className="shrink-0 w-10 text-center">
          {medal ? (
            <span className="text-2xl">{medal}</span>
          ) : (
            <span className="text-lg font-bold text-stone-400">#{rank}</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-semibold text-stone-800 truncate">{item.name}</div>
          <div className="text-sm text-stone-400">€{item.price.toFixed(2)}</div>
        </div>

        <div className="shrink-0 text-right">
          {item.avgScore !== null ? (
            <>
              <StarRating value={item.avgScore} size="sm" disabled />
              <div className="text-xs text-stone-400 mt-0.5">
                {item.ratingsCount} rating{item.ratingsCount !== 1 ? 's' : ''}
              </div>
            </>
          ) : (
            <span className="text-xs text-stone-400 italic">not rated</span>
          )}
        </div>

        <span className={`shrink-0 text-stone-400 transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-stone-100">
          {item.comments.length > 0 ? (
            <CommentSection comments={item.comments} canComment={false} />
          ) : (
            <p className="text-stone-400 text-sm italic py-2">No comments for this item.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function ResultsOverview({ items }: Props) {
  const ranked = rankItems(items);
  const podium = ranked.filter((i) => i.avgScore !== null).slice(0, 3);

  if (ranked.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-md p-6 text-center text-stone-400">
        No tasting items yet.
      </div>
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
        <div className="bg-gradient-to-b from-amber-50 to-white rounded-2xl shadow-md p-6">
          <h2 className="text-center text-lg font-bold text-stone-800 mb-6">🏆 Results</h2>
          <div className="flex items-end justify-center gap-3">
            {podiumOrder.map((item) => {
              const rank = podium.indexOf(item) + 1;
              return (
                <div key={item.id} className="flex-1 max-w-[10rem] flex flex-col items-center">
                  <div className="text-3xl mb-1">{MEDALS[rank - 1]}</div>
                  <div className="text-sm font-semibold text-stone-800 text-center truncate w-full px-1">
                    {item.name}
                  </div>
                  <div className="text-amber-600 font-bold text-sm mb-2">
                    {item.avgScore?.toFixed(1)}
                    <span className="text-stone-400 font-normal">/10</span>
                  </div>
                  <div
                    className={`w-full rounded-t-lg bg-gradient-to-b from-amber-300 to-amber-400 flex items-start justify-center pt-1 text-white font-black ${heights.get(
                      item.id
                    )}`}
                  >
                    {rank}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Full ranking — every entry, expandable for comments */}
      <div className="space-y-2">
        <h3 className="font-semibold text-stone-600 px-1">Full Ranking</h3>
        {ranked.map((item, idx) => (
          <RankingRow key={item.id} item={item} rank={idx + 1} />
        ))}
      </div>
    </div>
  );
}
