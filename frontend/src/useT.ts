import { useMemo } from 'react';
import { useLocale, Locale } from './wl/useLocale';
import { messages, plurals, PluralKey } from './i18n';

/**
 * Translation for this app's page content, e.g. t('home.create').
 *
 * Reads the same locale value as the shared `useLocale()` (the React port of
 * @wagnerluca/ui's composable), so the toggle in TopNav switches these strings
 * together with the design system's own. Mirrors the portfolio's
 * `composables/useT.js` — same key shape, plus:
 *
 *  - `{placeholder}` interpolation,
 *  - `tp()` for counted strings,
 *  - locale-aware number/price/time formatting, which is the part that quietly
 *    breaks otherwise: German writes "89,90 €" and "7,5", not "€89.90" / "7.5".
 */

// Full BCP-47 tags for Intl. 'en-GB' rather than 'en-US' because this is a
// euro-priced, European app: it formats EUR as "€89.90" and dates day-first.
const INTL_LOCALE: Record<Locale, string> = { de: 'de-DE', en: 'en-GB' };

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match
  );
}

export function useT() {
  const { locale } = useLocale();

  const format = useMemo(() => {
    const tag = INTL_LOCALE[locale];
    return {
      price: new Intl.NumberFormat(tag, { style: 'currency', currency: 'EUR' }),
      score: new Intl.NumberFormat(tag, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
      time: new Intl.DateTimeFormat(tag, { hour: '2-digit', minute: '2-digit' }),
      date: new Intl.DateTimeFormat(tag, { dateStyle: 'medium' }),
    };
  }, [locale]);

  /** t('section.field') with optional {placeholder} substitution. */
  function t(key: string, vars?: Record<string, string | number>): string {
    const [section, field] = key.split('.');
    const entry = (messages as Record<string, Record<string, Record<Locale, string>>>)[section]?.[
      field
    ];
    // Fall back to the key itself, exactly as the portfolio's useT does — a
    // missing translation shows up as "home.create" rather than an empty gap.
    if (!entry) return key;
    return interpolate(entry[locale], vars);
  }

  /** Counted strings: tp('results.ratingCount', 3) -> "3 Bewertungen". */
  function tp(key: PluralKey, count: number, vars?: Record<string, string | number>): string {
    const entry = plurals[key][locale];
    const template = count === 1 ? entry.one : entry.other;
    return interpolate(template, { count, ...vars });
  }

  return {
    locale,
    t,
    tp,
    /** 89.9 -> "89,90 €" (de) / "€89.90" (en) */
    formatPrice: (value: number) => format.price.format(value),
    /** 7.5 -> "7,5" (de) / "7.5" (en) */
    formatScore: (value: number) => format.score.format(value),
    /** ISO timestamp -> localised "HH:MM" */
    formatTime: (iso: string) => format.time.format(new Date(iso)),
    /** ISO timestamp -> localised date ('2. Okt. 2026' / '2 Oct 2026') */
    formatDate: (iso: string) => format.date.format(new Date(iso)),
  };
}
