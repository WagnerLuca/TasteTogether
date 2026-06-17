import StarRating from './StarRating';

interface Props {
  value: number; // 0 means "not yet set"
  onChange: (score: number) => void;
  max?: number;
}

/**
 * Touch-friendly rating input. The stars are tappable (half-star granularity)
 * for desktop, while the range slider gives a large drag target for mobile.
 * Both drive the same value.
 */
export default function RatingInput({ value, onChange, max = 10 }: Props) {
  const isSet = value > 0;
  const sliderValue = isSet ? value : 0.5;
  const pct = (sliderValue / max) * 100;

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-1">
        <StarRating value={value} max={max} onChange={onChange} size="md" showValue={false} />
        <div className="text-3xl font-bold text-stone-800 tabular-nums">
          {isSet ? value.toFixed(1) : '–'}
          <span className="text-lg text-stone-400 font-normal"> / {max}</span>
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
            background: `linear-gradient(to right, #be123c ${pct}%, #e7e5e4 ${pct}%)`,
          }}
          aria-label="Rating slider"
        />
        <div className="flex justify-between text-xs text-stone-400 mt-1.5 px-0.5">
          <span>0.5</span>
          <span>{max / 2}</span>
          <span>{max}</span>
        </div>
      </div>
    </div>
  );
}
