interface Props {
  size?: number | string;
  /** Colour of the tab ("Lasche"): a module accent key, e.g. 'berry'. */
  accent?: string;
}

/**
 * Port of LogoMark.vue — identical viewBox, points and stroke widths, so the
 * mark is pixel-for-pixel the one the other apps render. The tab takes the
 * module accent; the "WL" polyline inherits currentColor (i.e. text-ink).
 */
export default function LogoMark({ size = 32, accent = 'teal' }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <rect x="68" y="4" width="20" height="10" rx="5" style={{ fill: `var(--accent-${accent})` }} />
      <polyline
        points="6,26 24,88 42,30 60,88 78,26 78,88 96,88"
        stroke="currentColor"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
