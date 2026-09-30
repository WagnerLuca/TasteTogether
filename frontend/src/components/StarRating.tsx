import { useState } from 'react';
import { accentVar } from '../accent';
import { useT } from '../useT';

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
 *
 * Filled stars use this module's accent rather than a fixed amber: the accent is
 * the one colour this app owns, and unlike a hardcoded amber it has a dark-mode
 * value. An unfilled star is `text-border`, which likewise follows the theme.
 */
export default function StarRating({
  value,
  max = 10,
  onChange,
  disabled = false,
  size = 'lg',
  showValue = true,
}: Props) {
  const { t, formatScore } = useT();
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
        aria-label={t('rating.ariaValue', { value: formatScore(value), max })}
      >
        {Array.from({ length: max }, (_, idx) => {
          const starIndex = idx + 1;
          const frac = Math.max(0, Math.min(1, display - idx));
          return (
            <span
              key={starIndex}
              className="relative inline-block select-none leading-none"
              style={{ fontSize: px }}
            >
              <span className="text-border">★</span>
              <span
                className="absolute left-0 top-0 h-full overflow-hidden whitespace-nowrap"
                style={{ width: `${frac * 100}%`, color: accentVar() }}
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
                    aria-label={t('rating.ariaSet', { value: formatScore(starIndex - 0.5), max })}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 z-10 w-1/2 cursor-pointer"
                    onMouseEnter={() => setHover(starIndex)}
                    onClick={() => onChange!(starIndex)}
                    aria-label={t('rating.ariaSet', { value: formatScore(starIndex), max })}
                  />
                </>
              )}
            </span>
          );
        })}
      </div>
      {showValue && (
        <span
          className={`font-semibold tabular-nums text-ink ${size === 'sm' ? 'text-xs' : 'text-sm'}`}
        >
          {formatScore(display)}
          <span className="font-normal text-ink-muted">/{max}</span>
        </span>
      )}
    </div>
  );
}
