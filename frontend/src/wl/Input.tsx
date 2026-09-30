import { CSSProperties, InputHTMLAttributes, forwardRef } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

/**
 * Port of BaseInput.vue. Two deviations from the original, both deliberate:
 *
 * - the focus ring uses this module's accent (`--accent-berry`) rather than the
 *   hardcoded `focus:ring-school` the Vue component still carries — a school-blue
 *   ring in a berry-accented app looks like a bug;
 * - `label` is optional, so the same component covers the app's unlabelled
 *   inline fields (the comment box, the price field).
 */
// Tailwind's ring colour is a CSS variable, so pointing it at the accent token
// keeps the ring themed without an assembled `focus:ring-${accent}` class name.
const RING: CSSProperties = { '--tw-ring-color': 'var(--accent-berry)' } as CSSProperties;

const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { label, className = '', style, ...rest },
  ref
) {
  const field = (
    <input
      ref={ref}
      className={`w-full rounded-btn border border-border bg-surface px-3.5 py-2.5 text-sm text-ink
                  placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-offset-1
                  focus:ring-offset-bg ${className}`}
      style={{ ...RING, ...style }}
      {...rest}
    />
  );

  if (!label) return field;

  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-muted">
      {label}
      {field}
    </label>
  );
});

export default Input;
