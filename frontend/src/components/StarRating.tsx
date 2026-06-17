import { useState } from 'react';

interface Props {
  value: number;
  max?: number;
  onChange?: (score: number) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
}

const SIZE_PX: Record<NonNullable<Props['size']>, number> = { sm: 16, md: 22, lg: 30 };

/**
 * Star rating supporting fractional display (e.g. avg 7.3) and half-star
 * interactive input. Each star exposes a left half (x − 0.5) and a right
 * half (x) click zone when `onChange` is provided.
 */
export default function StarRating({
  value,
  max = 10,
  onChange,
  disabled = false,
  size = 'lg',
  showValue = true,
}: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const interactive = !!onChange && !disabled;
  const display = hover ?? value;
  const px = SIZE_PX[size];

  return (
    <div className="inline-flex items-center gap-2">
      <div
        className="inline-flex gap-0.5"
        onMouseLeave={() => setHover(null)}
        role={interactive ? 'slider' : 'img'}
        aria-label={`Rating ${value} of ${max}`}
      >
        {Array.from({ length: max }, (_, idx) => {
          const starIndex = idx + 1;
          const frac = Math.max(0, Math.min(1, display - idx));
          return (
            <span
              key={starIndex}
              className="relative inline-block leading-none select-none"
              style={{ fontSize: px }}
            >
              <span className="text-stone-300">★</span>
              <span
                className="absolute top-0 left-0 h-full overflow-hidden whitespace-nowrap text-amber-400"
                style={{ width: `${frac * 100}%` }}
              >
                ★
              </span>
              {interactive && (
                <>
                  <button
                    type="button"
                    className="absolute inset-y-0 left-0 z-10 w-1/2 cursor-pointer"
                    onMouseEnter={() => setHover(starIndex - 0.5)}
                    onClick={() => onChange!(starIndex - 0.5)}
                    aria-label={`Rate ${starIndex - 0.5} of ${max}`}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 z-10 w-1/2 cursor-pointer"
                    onMouseEnter={() => setHover(starIndex)}
                    onClick={() => onChange!(starIndex)}
                    aria-label={`Rate ${starIndex} of ${max}`}
                  />
                </>
              )}
            </span>
          );
        })}
      </div>
      {showValue && (
        <span className={`font-semibold tabular-nums text-stone-600 ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
          {display.toFixed(1)}
          <span className="text-stone-400 font-normal">/{max}</span>
        </span>
      )}
    </div>
  );
}
