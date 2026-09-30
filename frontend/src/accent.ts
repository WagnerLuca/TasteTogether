// This module's accent colour in the Wagner Luca design system.
//
// 'berry' (Altrosa / Dusty Rose) is TasteTogether's reserved accent — see
// ACCENTS in @wagnerluca/ui's src/composables/accents.js, where it now carries
// module: 'Verkostung'. It replaces the app's old hand-rolled rose/wine palette,
// which was the same idea (a wine red) without theme or dark-mode support.
//
// Don't reach for another module's colour (time/school/game) for this app's
// chrome — those belong to Zeiterfassung / Schulplaner / Arcade.
export const TASTING_ACCENT = 'berry';

/** `var(--accent-berry)` & friends, for inline styles on dynamic accents. */
export function accentVar(variant?: 'soft' | 'strong'): string {
  return `var(--accent-${TASTING_ACCENT}${variant ? `-${variant}` : ''})`;
}
