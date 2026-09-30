interface Props {
  /** 0–100 */
  value: number;
  accent?: string;
  className?: string;
}

/** Port of ProgressBar.vue (the original's fixed `mt-3.5` is left to the caller). */
export default function ProgressBar({ value, accent = 'berry', className = '' }: Props) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className={`h-1.5 overflow-hidden rounded-full bg-bg-alt ${className}`}>
      <div
        className="h-full rounded-full transition-[width] duration-300"
        style={{ width: `${clamped}%`, backgroundColor: `var(--accent-${accent})` }}
      />
    </div>
  );
}
