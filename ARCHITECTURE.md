# TasteTogether — Architecture

A real-time collaborative tasting platform where groups can rate and comment on food, wine, or any other products together.

---

## System Overview

```
┌─────────────┐     HTTP/REST      ┌─────────────────┐     Prisma ORM    ┌──────────────┐
│   Browser   │ ──────────────────▶│    Backend API   │ ─────────────────▶│  PostgreSQL  │
│  (React SPA)│ ◀──────────────────│  (Express + TS)  │                   │              │
└─────────────┘   JSON responses   └─────────────────┘                   └──────────────┘
       │
       │  (static files served by Nginx)
       ▼
┌─────────────┐
│    Nginx    │  proxy /api → backend:3001
│  (Frontend) │
└─────────────┘
```

The frontend polls `/api/events/:code/status` every 3 seconds for live updates (ratings progress, participant joins, new comments). No WebSocket dependency is required.

---

## Tech Stack

| Layer      | Technology                                     |
|------------|------------------------------------------------|
| Frontend   | React 18, TypeScript, Vite, Tailwind CSS       |
| Backend    | Node.js, Express, TypeScript                   |
| ORM        | Prisma 5                                       |
| Database   | PostgreSQL 16                                  |
| Container  | Docker, Docker Compose                         |
| CI/CD      | GitHub Actions → GitHub Container Registry     |

---

## Data Model

```
Event
  id           UUID PK
  name         TEXT
  code         TEXT UNIQUE        ← 6-char share code (e.g. "HK3PQ7")
  adminToken   TEXT UNIQUE        ← returned only at creation, stored client-side
  createdAt    TIMESTAMP

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
  isActive     BOOLEAN            ← only one item active at a time
  createdAt    TIMESTAMP

Rating
  id           UUID PK
  participantId UUID FK → Participant
  tastingItemId UUID FK → TastingItem
  score         INT (1–5)
  createdAt     TIMESTAMP
  UNIQUE(participantId, tastingItemId)  ← one rating per participant per item

Comment
  id            UUID PK
  eventId       UUID FK → Event
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
| `GET` | `/:code` | — | Get event metadata |
| `GET` | `/:code/status` | optional | Live status (polling endpoint) |

`POST /` request:
```json
{ "name": "Wine Night #3" }
```
Response includes `adminToken` — **store this, it is never returned again**.

`GET /:code/status` accepts optional query params:
- `?adminToken=…` → includes per-participant rating details
- `?sessionToken=…` → includes whether the caller has rated the active item

### Participants

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/:code/join` | — | Join with a username |

### Tasting Items (Admin)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/:code/items` | Admin | Add a tasting item |
| `PATCH` | `/:code/active-item` | Admin | Set or clear the active item |

`PATCH /:code/active-item` body: `{ "itemId": "uuid" }` or `{ "itemId": null }` to deactivate all.

### Ratings (Participant)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/:code/items/:id/rate` | Participant | Submit or update a rating (1–5) |

### Comments (Participant)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/:code/comments` | Participant | Post a comment |

### Authentication

- **Admin**: `X-Admin-Token: <token>` header
- **Participant**: `X-Session-Token: <token>` header

Tokens are stored in `localStorage` under `tastetogether_admin_<code>` and `tastetogether_session_<code>` respectively.

---

## User Flow

```
Host                                    Participants
──────────────────────────────────────────────────────────────────
1. Create event (enter name)
   ↓ receives share code + admin token
2. Share 6-char code (e.g. "HK3PQ7")
                                        3. Go to app, enter code + username
                                           ↓ receives session token
4. See participants join (live)
5. Add tasting item (name + price)
6. Activate item → participants notified
                                        7. See active item name + price
                                        8. Submit star rating (1–5)
9. See rating progress (X/Y rated)
10. Can see avg score per item
                                        9. Post comments (visible to all)
11. Deactivate item, add next item
    Repeat from step 5
```

---

## Docker Compose

Three services:

| Service | Image | Port |
|---------|-------|------|
| `postgres` | `postgres:16-alpine` | internal only |
| `backend` | built from `./backend` | `3001` (internal) |
| `frontend` | built from `./frontend` | `80` (host) |

The frontend Nginx container proxies `/api/*` → `backend:3001`.

Start:
```bash
docker compose up -d
```
App available at http://localhost.

---

## CI/CD Pipeline

GitHub Actions workflow (`.github/workflows/docker-build.yml`):
- Triggers on push to `main`/`master` and on pull requests
- Builds `backend` and `frontend` images in parallel
- Pushes to **GitHub Container Registry** (`ghcr.io`) on merge to default branch
- Uses layer caching (`cache-from/to: type=gha`) for fast rebuilds

Image names:
```
ghcr.io/<owner>/<repo>-backend:latest
ghcr.io/<owner>/<repo>-frontend:latest
```

---

## Local Development

Prerequisites: Node 20+, PostgreSQL running locally (or via Docker).

```bash
# Backend
cd backend
cp .env.example .env          # edit DATABASE_URL
npm install
npm run db:migrate            # apply migrations
npm run dev                   # starts on :3001

# Frontend (separate terminal)
cd frontend
npm install
npm run dev                   # starts on :5173, proxies /api → :3001
```

For database migrations during development:
```bash
cd backend
npx prisma migrate dev --name <description>
```

---

## Security Considerations

- Admin and session tokens are UUIDs generated server-side; they are not guessable
- Admin token is **never returned** after initial event creation
- Usernames must be unique per event (enforced at DB level)
- Ratings are upserted — participants can update but not double-vote
- No passwords, no personal data collected beyond username
- CORS is enabled for development; restrict origins in production
