import StarRating from './StarRating';
import { accentVar } from '../accent';
import { useT } from '../useT';

interface Props {
  value: number; // 0 means "not yet set"
  onChange: (score: number) => void;
  max?: number;
}

/**
 * Touch-friendly rating input. The stars are tappable (half-star granularity)
 * for desktop, while the range slider gives a large drag target for mobile.
 * Both drive the same value.
 *
 * The slider track is the one place a gradient has to be built inline (it
 * depends on the current value) — it interpolates between the accent and
 * `--color-bg-alt`, so it stays correct in dark mode. The thumb is styled from
 * the same tokens in `src/index.css`.
 */
export default function RatingInput({ value, onChange, max = 10 }: Props) {
  const { t, formatScore } = useT();
  const isSet = value > 0;
  const sliderValue = isSet ? value : 0.5;
  const pct = (sliderValue / max) * 100;

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-1">
        <StarRating value={value} max={max} onChange={onChange} size="md" showValue={false} />
        <div className="text-3xl font-bold tabular-nums text-ink">
          {isSet ? formatScore(value) : '–'}
          <span className="text-lg font-normal text-ink-muted"> / {max}</span>
        </div>
      </div>

      <div>
        <input
          type="range"
          min={0.5}
          max={max}
          step={0.5}
          value={sliderValue}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="rating-slider"
          style={{
            background: `linear-gradient(to right, ${accentVar()} ${pct}%, var(--color-bg-alt) ${pct}%)`,
          }}
          aria-label={t('rating.sliderLabel')}
        />
        <div className="mt-1.5 flex justify-between px-0.5 text-xs text-ink-muted">
          <span>{formatScore(0.5)}</span>
          <span>{max / 2}</span>
          <span>{max}</span>
        </div>
      </div>
    </div>
  );
}
