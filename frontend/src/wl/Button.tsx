import { ButtonHTMLAttributes, forwardRef } from 'react';

export type ButtonVariant = 'primary' | 'accent' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Accent key for the 'accent' variant. Defaults to this module's accent. */
  accent?: string;
  full?: boolean;
}

/**
 * Port of BaseButton.vue, plus two additions this app needs:
 *
 * - an `accent` variant (accent-filled with `--on-accent` text) — the package's
 *   primary is deliberately ink-on-bg, which is right for a portfolio CTA but
 *   too quiet for the main action on a form-heavy screen;
 * - a `sm` size, because the original's px-6 py-3 is too large for the inline
 *   controls in the item list.
 *
 * Every colour still comes from a token, never a hex value.
 */
const SIZES: Record<ButtonSize, string> = {
  sm: 'px-3.5 py-2 text-xs',
  md: 'px-6 py-3 text-sm',
};

const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'primary', size = 'md', accent, full = false, className = '', style, ...rest },
  ref
) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-btn font-semibold transition-transform ' +
    'disabled:cursor-not-allowed disabled:opacity-50 enabled:hover:-translate-y-0.5';

  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-ink text-bg enabled:hover:shadow-lg',
    accent: 'text-on-accent enabled:hover:shadow-lg',
    ghost: 'border border-border bg-transparent text-ink enabled:hover:bg-bg-alt',
    danger: 'bg-danger text-on-accent enabled:hover:shadow-lg',
  };

  return (
    <button
      ref={ref}
      className={`${base} ${SIZES[size]} ${variants[variant]} ${full ? 'w-full' : ''} ${className}`}
      // Assembled class names (`bg-${accent}`) would be purged by Tailwind, so
      // the accent fill goes through the CSS variable directly.
      style={variant === 'accent' ? { backgroundColor: `var(--accent-${accent ?? 'berry'})`, ...style } : style}
      {...rest}
    />
  );
});

export default Button;
