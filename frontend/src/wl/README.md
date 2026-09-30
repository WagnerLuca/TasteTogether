# `src/wl/` — the design system's chrome, ported to React

`@wagnerluca/ui` is a **Vue** package: `src/index.js` exports `.vue` SFCs
(`TopNav`, `BaseButton`, `LogoLockup`, …) plus Vue composables built on `ref()`.
None of that can be imported from React.

What this app therefore consumes from the real dependency is its
**framework-agnostic half**, and that part is genuinely shared — not copied:

| From the package | Used where |
|---|---|
| `@wagnerluca/ui/tokens.css` | `src/index.css` (the `:root` / `.dark` CSS variables) |
| `@wagnerluca/ui/tailwind-preset` | `tailwind.config.js` (palette, 720px breakpoints, fonts, radii) |

Everything in this folder is the thin layer that can't be shared that way:
React equivalents of the Vue components and composables, written to the same
markup, class names and behaviour as their originals in
`wagnerluca-design-system/src/`. They deliberately hold **no colour values of
their own** — all colour comes from the tokens above, so a change in the design
system still propagates here on the next release.

This is the same position `time-tracking` (SvelteKit) is in, and the design
system's own `CLAUDE.md` names it: non-Vue consumers take `tokens.css` /
`tailwind-theme.css` only. If the package ever grows framework-neutral
(headless/web-component) versions of these components, delete this folder and
import them instead.

## Keeping it in sync

| Here | Original in the design system |
|---|---|
| `useTheme.ts` | `src/composables/useTheme.js` — same `wl-theme` key, same `.dark` class |
| `useLocale.ts` | `src/composables/useLocale.js` — same `wl-locale` key, same `de`/`en` fallback |
| `LogoMark.tsx` / `LogoLockup.tsx` | `src/components/brand/LogoMark.vue` / `LogoLockup.vue` — identical SVG geometry |
| `TopNav.tsx` | `src/components/layout/TopNav.vue` |
| `Button.tsx`, `Input.tsx`, `Badge.tsx`, `ProgressBar.tsx`, `StatusPill.tsx` | `src/components/base/*.vue` |
| `Card.tsx` | no direct original — the `rounded-card bg-surface shadow-soft` surface used across the styleguide |

Two rules carried over from the package, worth restating because breaking them
fails silently:

1. **Accent colours go through CSS variables, never assembled class names.**
   `style={{ backgroundColor: 'var(--accent-berry-soft)' }}`, not
   `` className={`bg-${accent}-soft`} `` — Tailwind can't see runtime-built class
   names and purges them.
2. **Navigation switches at 720px (`sm`), not `md`.** Below it the bottom bar
   shows and the tab row hides; at/above it the reverse. Mixing the two
   breakpoints is what once left 720–1023px with no navigation at all.

The storage keys are intentionally the *same* as the other apps' (`wl-theme`,
`wl-locale`): served from one origin, a visitor's theme and language follow them
from module to module.
