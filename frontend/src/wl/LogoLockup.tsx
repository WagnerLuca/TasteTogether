import LogoMark from './LogoMark';

interface Props {
  size?: number | string;
  accent?: string;
  /** Set -> renders the "WL {product}" sub-brand instead of "Wagner Luca". */
  product?: string;
}

/**
 * Port of LogoLockup.vue. A module app passes its own accent + product, so the
 * header reads "WL TasteTogether" with a berry tab — the portfolio is the only
 * consumer that shows the full "Wagner Luca" wordmark.
 */
export default function LogoLockup({ size = 32, accent = 'teal', product = '' }: Props) {
  return (
    <div className="flex items-center gap-2.5 text-ink">
      <LogoMark size={size} accent={accent} />
      <span className="font-display text-lg font-bold tracking-tighter">
        {product ? (
          <>
            <span className="opacity-60">WL</span> {product}
          </>
        ) : (
          'Wagner Luca'
        )}
      </span>
    </div>
  );
}
