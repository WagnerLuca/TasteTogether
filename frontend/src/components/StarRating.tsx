import { useState } from 'react';

interface Props {
  value: number;
  onChange?: (score: number) => void;
  disabled?: boolean;
  size?: 'sm' | 'lg';
}

export default function StarRating({ value, onChange, disabled = false, size = 'lg' }: Props) {
  const [hovered, setHovered] = useState(0);

  const textSize = size === 'lg' ? 'text-4xl' : 'text-xl';

  return (
    <div
      className="flex gap-1"
      onMouseLeave={() => setHovered(0)}
      aria-label={`Rating: ${value} out of 5`}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const active = star <= (hovered || value);
        return (
          <button
            key={star}
            type="button"
            disabled={disabled}
            onClick={() => onChange?.(star)}
            onMouseEnter={() => !disabled && setHovered(star)}
            className={`${textSize} transition-all duration-100 ${
              disabled ? 'cursor-default' : 'cursor-pointer hover:scale-110'
            } ${active ? 'text-amber-400' : 'text-stone-300'}`}
            aria-label={`${star} star${star !== 1 ? 's' : ''}`}
          >
            {active ? '★' : '☆'}
          </button>
        );
      })}
    </div>
  );
}
