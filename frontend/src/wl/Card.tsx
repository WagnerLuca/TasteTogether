import { HTMLAttributes, ReactNode } from 'react';

interface Props extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Tint the surface with this module's accent (used for the "now tasting" panel). */
  accent?: string;
  padded?: boolean;
}

/**
 * The system's standard raised surface: `rounded-card` (22px from the preset),
 * `bg-surface`, `shadow-soft`. There's no single BaseCard.vue to port — this is
 * the surface repeated across the styleguide and ModuleCard/DashCard, factored
 * out here so every panel in the app agrees.
 */
export default function Card({
  children,
  accent,
  padded = true,
  className = '',
  style,
  ...rest
}: Props) {
  const tinted = accent
    ? { backgroundColor: `var(--accent-${accent}-soft)`, borderColor: `var(--accent-${accent})` }
    : undefined;

  return (
    <div
      className={`rounded-card border shadow-soft ${
        accent ? '' : 'border-border bg-surface'
      } ${padded ? 'p-6' : ''} ${className}`}
      style={{ ...tinted, ...style }}
      {...rest}
    >
      {children}
    </div>
  );
}
