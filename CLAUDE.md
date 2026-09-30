# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

**TasteTogether** — a real-time collaborative tasting app (wine, food, anything
with a price and an opinion). A host creates an event, shares a 6-char code or QR
link, activates one item at a time, and reveals a podium + ranking at the end.
Participants join with just a name, rate in half-star steps (0.5–10) and comment
per item. Participants have no account — a session token + their name in
`localStorage` is all. The host sets a password per event and holds a JWT.

Read `ARCHITECTURE.md` first — it has the data model, the full API reference, the
user flow and the deployment/CI details. This file covers the conventions that
aren't obvious from the code.

- **frontend/** — React 18 + TypeScript + Vite + Tailwind v3, consuming
  `@wagnerluca/ui` from **GitHub Packages** (`frontend/.npmrc`, scope
  `@wagnerluca` → `npm.pkg.github.com`). Reads require a `read:packages` token in
  `NODE_AUTH_TOKEN`.
- **backend/** — C# / .NET 10 minimal APIs + EF Core (Npgsql) on PostgreSQL 16.
  Two files: `Program.cs` (every endpoint + auth) and `Data.cs` (entities +
  `DbContext`).
- The frontend polls `/api/events/:code/status` every 3s via
  `src/useEventStatus.ts`, shared by both views. No WebSockets — don't add one
  without a reason; the polling endpoint is deliberately the single source of
  live state. A failed poll must never become a permanent error screen (it once
  did — one hiccup on the first request stuck forever): only a `404` is final,
  everything else shows "reconnecting" and retries on the next tick.

## Commands

```bash
# Frontend
cd frontend
export NODE_AUTH_TOKEN=<classic PAT with read:packages>   # for @wagnerluca/ui
npm install
npm run dev        # http://localhost:5173, proxies /api → :3001
npm run build      # tsc && vite build — tsc runs first, so type errors fail the build

# Backend (.NET 10 SDK; dev DB + JWT secret in appsettings.Development.json)
cd backend
dotnet run                    # :3001
node smoke-test.mjs           # hits every endpoint of the running backend

# Whole stack
export NODE_AUTH_TOKEN=...
docker compose up --build     # http://localhost:8080
```

Node.js ≥ 20, .NET 10 SDK. The only test is `backend/smoke-test.mjs`
(end-to-end against a running backend — creates throwaway events); no lint.

## This is a React app consuming a Vue design system

The single most important thing to understand before touching the UI.

`@wagnerluca/ui` exports `.vue` SFCs and Vue composables — **none of it is
importable from React**. What this app takes from the real dependency is its
framework-agnostic half, and that part is genuinely shared:

- `@wagnerluca/ui/tokens.css` → imported at the top of `src/index.css`
- `@wagnerluca/ui/tailwind-preset` → `tailwind.config.js`

Everything else is ported into **`src/wl/`**: React versions of `useTheme`,
`useLocale`, `LogoMark`, `LogoLockup`, `TopNav` and the base components, written
to the same markup and class names as the Vue originals and holding **no colour
values of their own**. `src/wl/README.md` is the sync table — read it before
editing anything in that folder, and update it if you add a component.

This is the same position `time-tracking` (SvelteKit) is in; the design system's
own `CLAUDE.md` documents that non-Vue consumers take `tokens.css` /
`tailwind-theme.css` only. If the package ever ships framework-neutral
components, `src/wl/` should be deleted in favour of them.

Consequences worth knowing:

- The Tailwind `content` glob does **not** include
  `node_modules/@wagnerluca/ui/**` — unlike the portfolio and the arcade, which
  must scan `src/` *and* `dev/`. There are no package components in this app's
  output, so there is nothing there to scan.
- `vite.config.ts` needs neither `optimizeDeps.exclude` nor
  `resolve.dedupe` for the package (both exist in the Vue consumers because
  esbuild can't pre-bundle raw `.vue`). Nothing here imports the SFCs.
- `.npmrc` sets `legacy-peer-deps=true` on purpose: the package declares
  `vue`/`vue-router` as peers and npm would otherwise install Vue into a React
  dependency tree. The committed `package-lock.json` was generated with that
  setting — keep them consistent or `npm ci` drifts.

## Accent colour: `berry`

`src/accent.ts` exports `TASTING_ACCENT = 'berry'` (Altrosa / Dusty Rose) plus an
`accentVar()` helper. It's this module's reserved colour in the design system —
`ACCENTS` in `wagnerluca-design-system/src/composables/accents.js` carries
`module: 'Verkostung'` for it, and `docs/favicon-tastetogether.svg` is the
matching favicon (copied to `frontend/public/favicon.svg`).

It replaced a hand-rolled `wine`/`rose` Tailwind palette. Don't reintroduce
hardcoded hex colours: they can't follow light/dark. And don't borrow another
module's accent (`time`/`school`/`game`) for this app's chrome.

Two rules carried over from the design system, both of which fail **silently**:

1. **Accents go through CSS variables, never assembled class names.**
   `style={{ backgroundColor: accentVar('soft') }}`, not
   `` className={`bg-${accent}-soft`} `` — Tailwind can't see runtime-built class
   names and purges them.
2. **Fractional spacing must exist in the preset.** Tailwind v3's spacing scale
   is a fixed list; `4.5`/`6.5`/`9.5` are added in the preset, and any *other*
   fractional value produces no CSS at all.

One deliberate exception to "everything from tokens": the **QR code** in
`AdminEvent` keeps a white background with near-black modules in both themes. On
a dark surface a themed QR has far too little contrast for a phone camera.

## i18n (German/English)

Client-side toggle in `TopNav`, no URL per language, no i18n framework — the same
pattern as the portfolio and the arcade:

1. `src/wl/useLocale.ts` owns the shared, persisted locale (`wl-locale`,
   `navigator.language` fallback, German default).
2. `src/i18n.ts` holds this app's copy as `{ section: { field: { de, en } } }`,
   plus a `plurals` map for counted strings.
3. `src/useT.ts` → `t('home.create')`, `tp('results.ratingCount', n)`.

When adding copy: add the German/English pair to `src/i18n.ts` and call `t()` —
never hardcode either language in a component. Generic chrome shared by several
modules belongs in the design system's own `DICTIONARY` instead.

`useT()` also returns `formatPrice` / `formatScore` / `formatTime`, and they
matter: German writes `89,90 €` and `7,5` where English writes `€89.90` and
`7.5`. Use them instead of `toFixed()` — `toFixed` was what the app did before
and it produced English-only numbers in a German UI.

## No MobileNav, and why

The portfolio and arcade pair `TopNav` with `MobileNav` under the design
system's single 720px breakpoint. This app has neither, on purpose: there are no
site-wide sections to navigate: you're either on the entry page or inside one
event (reached by code or QR). A bottom tab bar would have nothing to hold.
`TopNav` is rendered without `tabs`, so the tab row never appears and the
720px show/hide rule doesn't come into play. If you ever add real routes,
add the tabs *and* a `MobileNav` — and gate both on `sm`, never `md`.

`/board/:code` (the TV display) sits **outside** the TopNav layout route in
`App.tsx` on purpose — it is full-bleed, `h-screen overflow-hidden`, and must
never scroll. Its QR code follows the same white-frame exception as `AdminEvent`.

## Backend gotchas

- **Two auth models side by side.** Host: `Authorization: Bearer <JWT>` with one
  claim `event: <code>`, 24 h, from `POST /` or `POST /:code/admin/login`
  (password, rate-limited). The admin route group checks the claim against the
  route's `{code}` — a valid token for another event is a `403`. Participant:
  `X-Session-Token`, a server UUID, unchanged. `GET /:code/status` is anonymous
  and just *reads* the bearer token to decide whether to include per-person
  ratings.
- `Jwt:Secret` (env `Jwt__Secret`, ≥ 32 chars) is required — the app refuses
  to start without it. `docker-compose.prod.yml` fails fast if `JWT_SECRET` is
  unset.
- **Schema = the old Prisma schema** (table = class name, camelCase columns —
  the loop at the end of `Db.OnModelCreating`). No migrations: `EnsureCreated`
  plus idempotent `ALTER`s in `Program.cs`. Timestamps are `timestamp(3)` holding
  UTC; the `UtcConverter` in `Data.cs` restores `Kind=Utc` so JSON gets the `Z`.
- Ratings are **upserted** (`UNIQUE(participantId, tastingItemId)`), so a
  participant can change a rating but never double-vote.
- Only one item is active at a time; `PATCH /:code/active-item` with
  `{ itemId: null }` clears it.
- Revealing results (`PATCH /:code/results`) is what ends the tasting: the
  participant view hides the active item and the "tasted so far" list once
  `resultsRevealed` is true.
- Comments are scoped **per tasting item**, not per event.
- Error bodies are `{ "error": "…" }` everywhere — the frontend reads
  `response.data.error`.

## Deployment

`docker-compose.yml` builds from source; `docker-compose.prod.yml` pulls the
GHCR images that `.github/workflows/ci-cd.yml` publishes. Both default the app to
host port **8080** (`HTTP_PORT`) rather than 80, so several Wagner Luca modules
can run on one machine. `IMAGE_TAG` pins a release (`v1.2.3`) or a commit
(`sha-a1b2c3d`) — one tag for both images, as in the arcade.
