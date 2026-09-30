import { ReactNode } from 'react';

interface Props {
  accent?: string;
  children: ReactNode;
  className?: string;
}

/** Port of StatusPill.vue — solid accent fill, mono type, `--on-accent` text. */
export default function StatusPill({ accent = 'berry', children, className = '' }: Props) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 font-mono text-[0.72rem] font-medium ${className}`}
      style={{ backgroundColor: `var(--accent-${accent})`, color: 'var(--on-accent)' }}
    >
      {children}
    </span>
  );
}
