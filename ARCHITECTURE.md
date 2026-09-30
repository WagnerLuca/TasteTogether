# TasteTogether — Architecture

A real-time collaborative tasting platform where groups can rate and comment on food, wine, or any other products together.

---

## System Overview

```
┌─────────────┐     HTTP/REST      ┌─────────────────┐      EF Core      ┌──────────────┐
│   Browser   │ ──────────────────▶│    Backend API   │ ─────────────────▶│  PostgreSQL  │
│  (React SPA)│ ◀──────────────────│ (ASP.NET Core 10)│                   │              │
└─────────────┘   JSON responses   └─────────────────┘                   └──────────────┘
       │
       │  (static files served by Nginx)
       ▼
┌─────────────┐
│    Nginx    │  proxy /api → backend:3001
│  (Frontend) │
└─────────────┘
```

The frontend polls `/api/events/:code/status` every 3 seconds for live updates (ratings progress, participant joins, new comments) — one hook, `frontend/src/useEventStatus.ts`, for both views. A failed poll is retried on the next tick with a "reconnecting" note; only a `404` ends it. No WebSocket dependency is required.

---

## Tech Stack

| Layer      | Technology                                                  |
|------------|-------------------------------------------------------------|
| Frontend   | React 18, TypeScript, Vite, Tailwind v3                     |
| Design     | `@wagnerluca/ui` — shared design tokens + Tailwind preset    |
| Backend    | C# / .NET 10, ASP.NET Core minimal APIs, JWT bearer auth    |
| ORM        | EF Core 10 (Npgsql)                                         |
| Database   | PostgreSQL 16                                               |
| Container  | Docker, Docker Compose                                      |
| CI/CD      | GitHub Actions → GitHub Container Registry                  |

---

## Design System & i18n

TasteTogether is a module of the Wagner Luca ecosystem and renders in its shared
Corporate Identity, using the reserved **`berry`** accent (Altrosa / Dusty Rose).

`@wagnerluca/ui` is a **Vue** package, so a React app can only consume its
framework-agnostic half — and does, as a real dependency from GitHub Packages:

- `@wagnerluca/ui/tokens.css` — the `:root` / `.dark` CSS custom properties,
  imported at the top of `src/index.css`;
- `@wagnerluca/ui/tailwind-preset` — palette, the 720px breakpoint model, the
  display/body/mono faces and the card/btn radii, applied in `tailwind.config.js`.

The Vue components (`TopNav`, `BaseButton`, …) can't be imported, so React
equivalents live in **`frontend/src/wl/`** — same markup and class names as the
originals, no colour values of their own. See `frontend/src/wl/README.md` for the
sync table and the two rules that fail silently if broken (accents via CSS
variables; nav switches at `sm`/720px).

Dark mode is a single `.dark` class on `<html>`, applied pre-paint by an inline
script in `index.html` and owned thereafter by `src/wl/useTheme.ts`.

**Localization** is German/English, client-side, no URL prefix and no i18n
framework — the same pattern the portfolio and the arcade use:

- `src/wl/useLocale.ts` holds the shared, persisted locale (`wl-locale`);
- `src/i18n.ts` is this app's own copy (`{ section: { field: { de, en } } }`),
  read through `useT()` → `t('home.create')`, with `tp()` for counted strings;
- `useT()` also exposes `formatPrice` / `formatScore` / `formatTime`, because
  German writes `89,90 €` and `7,5` where English writes `€89.90` and `7.5`.

Theme and locale keys (`wl-theme`, `wl-locale`) are deliberately the ecosystem's,
so both choices follow a visitor across modules served from one origin.

---

## Data Model

```
Event
  id              UUID PK
  name            TEXT
  code            TEXT UNIQUE      ← 6-char share code (e.g. "HK3PQ7")
  adminPasswordHash TEXT           ← host password (ASP.NET Identity PasswordHasher)
  resultsRevealed BOOLEAN          ← when true, all participants see the ranking
  createdAt       TIMESTAMP

Participant
  id           UUID PK
  eventId      UUID FK → Event
  username     TEXT
  sessionToken TEXT UNIQUE        ← returned at join, stored client-side
  joinedAt     TIMESTAMP
  UNIQUE(eventId, username)

TastingItem
  id           UUID PK
  eventId      UUID FK → Event
  name         TEXT               ← e.g. "Château Margaux 2018"
  price        FLOAT              ← e.g. 89.90
  position     INT                ← running order set by the host (ties → createdAt)
  isActive     BOOLEAN            ← only one item active at a time
  createdAt    TIMESTAMP

Rating
  id           UUID PK
  participantId UUID FK → Participant
  tastingItemId UUID FK → TastingItem
  score         FLOAT (0.5–10, in 0.5 half-star steps)
  createdAt     TIMESTAMP
  UNIQUE(participantId, tastingItemId)  ← one rating per participant per item

Comment
  id            UUID PK
  tastingItemId UUID FK → TastingItem   ← comments are scoped per tasting item
  participantId UUID FK → Participant
  text          TEXT
  createdAt     TIMESTAMP
```

---

## API Reference

All endpoints are under `/api/events`.

### Events

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/` | — | Create a new event |
| `POST` | `/:code/admin/login` | — | Trade the host password for an admin JWT (10/min per IP) |
| `GET` | `/:code` | — | Get event metadata |
| `GET` | `/:code/status` | optional | Live status (polling endpoint) |

`POST /` request:
```json
{ "name": "Wine Night #3", "password": "min. 6 chars" }
```
Response: `{ "event": {…}, "token": "<admin JWT>" }`. The same token comes from
`POST /:code/admin/login` with `{ "password": "…" }`, so the host can sign in
again from any device.

`GET /:code/status` optionally takes:
- `Authorization: Bearer <admin JWT>` → includes per-participant rating details
- `?sessionToken=…` → includes whether the caller has rated the active item

### Participants

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/:code/join` | — | Join with a username |
| `DELETE` | `/:code/participants/:id` | Admin | Remove a participant — their ratings and comments go too (FK cascade). They can rejoin under any name. |

A removed participant's next status poll carries `sessionRecognized: false`
(it is `null` when no `sessionToken` was sent at all); the participant view then
drops the stored session and shows the join form with a notice.

### Tasting Items (Admin)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/:code/items` | Admin | Add a tasting item (appended to the running order) |
| `PUT` | `/:code/items/order` | Admin | Set the running order: `{ "itemIds": [...] }`, every item exactly once |
| `PATCH` | `/:code/active-item` | Admin | Set or clear the active item |
| `PATCH` | `/:code/results` | Admin | Reveal or hide the ranking for everyone |

`PATCH /:code/active-item` body: `{ "itemId": "uuid" }` or `{ "itemId": null }` to deactivate all.

`PATCH /:code/results` body: `{ "revealed": true }` or `{ "revealed": false }`.

### Ratings (Participant)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/:code/items/:id/rate` | Participant | Submit or update a rating |

`POST /:code/items/:id/rate` body: `{ "score": 7.5 }` — score is a multiple of `0.5` between `0.5` and `10` (half-star granularity).

### Comments (Participant)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/:code/items/:id/comments` | Participant | Post a comment on a specific item |

Comments are scoped to individual tasting items. Each item carries its own `comments[]` array in the status response.

### Authentication

- **Admin**: `Authorization: Bearer <JWT>`. HS256, signed with `Jwt:Secret`,
  one claim `event: <code>`, valid 24 h. A token for event A gets `403` on event B.
- **Participant**: `X-Session-Token: <token>` header — a server-generated UUID,
  no account, no password.

Both live in `localStorage`: `tastetogether_admin_<code>` (the JWT — the client
treats an expired one as absent and shows the login card) and
`tastetogether_session_<code>` (`{ sessionToken, username }`).

---

## User Flow

```
Host                                    Participants
──────────────────────────────────────────────────────────────────
1. Create event (name + host password)
   ↓ receives share code + admin JWT
2. Share 6-char code (e.g. "HK3PQ7")
                                        3. Go to app, enter code + username
                                           ↓ receives session token
4. See participants join (live)
5. Add tasting item (name + price)
6. Activate item → participants notified
                                        7. See active item name + price
                                        8. Submit half-star rating (0.5–10)
                                        9. Post comments on that item
10. See rating progress (X/Y rated)
11. See per-participant scores + avg
12. Deactivate item, add next item
    Repeat from step 5
13. Reveal results → everyone sees
    podium (🥇🥈🥉) + full ranking
    with collapsible comments
```

---

## Frontend Routes

| Route | Who | What |
|-------|-----|------|
| `/` | everyone | Create or join an event |
| `/event/:code` | participants | Rate + comment on the active item |
| `/admin/:code` | host (JWT) | Items, running order (↑ ↓, *Back / Next*), participants, reveal |
| `/board/:code` | a screen in the room | Chrome-free: current item + live comments, big QR bottom-right; waiting screen before, ranking after the reveal. Public, read-only. |

*Next* / *Back* are purely client-side: they call `PATCH /:code/active-item`
with the neighbouring item. With nothing active, *Next* starts the first item
nobody has rated yet; on the last item it ends the tasting (clears the active item).

---

## Docker Compose

Three services:

| Service | Image | Port |
|---------|-------|------|
| `postgres` | `postgres:16-alpine` | internal only |
| `backend` | built from `./backend` | `3001` (internal) |
| `frontend` | built from `./frontend` | `8080` (host) |

The frontend Nginx container proxies `/api/*` → `backend:3001`, so the app is
same-origin and needs no CORS. The service **must** stay named `backend` —
that hostname is baked into the frontend image's `nginx.conf`.

Start:
```bash
export NODE_AUTH_TOKEN=<classic PAT with read:packages>   # see below
docker compose up --build
```
App available at http://localhost:8080 (override with `HTTP_PORT`).

To deploy the pre-built images instead:
```bash
cp .env.example .env      # then set POSTGRES_PASSWORD and JWT_SECRET
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

### Why the frontend build needs a token

`@wagnerluca/ui` is published to **GitHub Packages**, which requires auth even
for reads (`frontend/.npmrc`). The token reaches the build as a **BuildKit
secret** — never an `ARG`/`ENV`, so it stays out of the image layers and out of
`docker history`. `docker-compose.yml` reads it from the host env of the same
name; CI injects it from `secrets.GHP_READ_TOKEN`. Forget to export it and the
install fails with a 401.

---

## CI/CD Pipeline

GitHub Actions workflow (`.github/workflows/ci-cd.yml`) — the same shape as the
arcade's:
- Triggers on push to `main`/`master`, on `v*.*.*` tags, on pull requests, and
  via `workflow_dispatch`
- Builds `backend` and `frontend` images in parallel
- Pushes to **GitHub Container Registry** (`ghcr.io`) on branch/tag pushes;
  pull requests build only (no login, no push), so a PR still gates the images
- Tags: `sha-<commit>`, `<version>` on a `v*.*.*` tag, and `latest` on the
  default branch
- Uses layer caching (`cache-from/to: type=gha`) for fast rebuilds
- The frontend job additionally passes `NODE_AUTH_TOKEN` as a BuildKit secret.
  The default `GITHUB_TOKEN` cannot substitute: it is scoped to *this* repo and
  cannot read a package owned by the design system.

Image names (lowercase — spelled out in the workflow rather than derived from
the mixed-case repo name):
```
ghcr.io/<owner>/tastetogether-backend:latest
ghcr.io/<owner>/tastetogether-frontend:latest
```

---

## Local Development

Prerequisites: .NET 10 SDK, Node 20+, PostgreSQL running locally (or via Docker).

```bash
# Backend — connection string + dev JWT secret are in appsettings.Development.json
cd backend
dotnet run                    # starts on :3001, creates the schema on first start
node smoke-test.mjs           # end-to-end check of every endpoint (needs a running backend)

# Frontend (separate terminal)
cd frontend
export NODE_AUTH_TOKEN=<classic PAT with read:packages>   # for @wagnerluca/ui
npm install
npm run dev                   # starts on :5173, proxies /api → :3001
```

There are no migrations: `EnsureCreated` builds the schema on an empty
database, and the one-off `ALTER`s in `Program.cs` upgrade a database created by
the old Prisma backend (same table/column names, `adminToken` →
`adminPasswordHash`; events from that era have no password and can't be
administered any more). A future schema change needs another idempotent `ALTER`
there — or EF migrations, once that list gets long.

---

## Security Considerations

- Host passwords are hashed (PBKDF2 via ASP.NET Identity's `PasswordHasher`);
  login is rate-limited to 10 attempts/min per client IP (`X-Real-IP` from nginx)
- Admin JWTs are scoped to one event and expire after 24 h; rotating
  `JWT_SECRET` signs every host out
- Session tokens are server-generated UUIDs — not guessable
- Usernames must be unique per event (enforced at DB level)
- Ratings are upserted — participants can update but not double-vote
- No personal data collected beyond username
- No CORS: the API is only reached same-origin through nginx / the Vite proxy
