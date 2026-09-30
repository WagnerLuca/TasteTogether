import wlPreset from '@wagnerluca/ui/tailwind-preset';

/** @type {import('tailwindcss').Config} */
export default {
  // The shared Wagner Luca preset supplies the whole palette (bg/surface/ink/
  // border + the accent triplets), the 720px breakpoint model, the display/body
  // fonts and the card/btn radii. Every colour it defines points at a CSS
  // variable from @wagnerluca/ui/tokens.css, so one `.dark` class on <html>
  // switches the entire app — see src/wl/useTheme.ts.
  //
  // The old hand-rolled `wine` palette is gone: hardcoded hex can't follow the
  // theme. Use the accent utilities (berry-soft / berry / berry-strong) instead.
  presets: [wlPreset],
  // Only this app's own sources. The package's Vue components aren't used here
  // (this is React — see src/wl/README.md), so there is nothing to scan under
  // node_modules/@wagnerluca/ui.
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  plugins: [],
};
