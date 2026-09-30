import { ReactNode } from 'react';

interface Props {
  /** time | school | game | future | teal | berry | mustard | slate | danger */
  accent?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Port of BaseBadge.vue. As in the original: soft accent surface, strong accent
 * text, both via CSS variables so it works in dark mode without a second rule
 * — and so Tailwind can't purge a class name it never sees.
 */
export default function Badge({ accent = 'berry', children, className = '' }: Props) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${className}`}
      style={{
        backgroundColor: `var(--accent-${accent}-soft)`,
        color: `var(--accent-${accent}-strong)`,
      }}
    >
      {children}
    </span>
  );
}
