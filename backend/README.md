# RD/FD Register — Backend

A real backend for the register: every entry is stored centrally in a SQLite
database, so every device/browser sees the same data. Admin access is a
proper login (PIN → JWT token), not just a client-side check.

## Stack

- **Express** — HTTP API
- **better-sqlite3** — file-based SQL database (`backend/data/rdfd.sqlite`), fast and needs no separate DB server
- **bcryptjs** — the admin PIN is hashed, never stored or sent in plain text after setup
- **jsonwebtoken** — admin sessions are signed tokens, expire automatically
- **express-rate-limit** + **helmet** — brute-force and basic flood protection, secure headers
- **xlsx** — generates the monthly-sheet Excel export server-side

## Setup

```bash
cd backend
npm install
cp .env.example .env
```

Open `.env` and set:
- `JWT_SECRET` — a long random string (generate with the command in the comment)
- `CORS_ORIGIN` — the URL(s) your frontend will run on, comma-separated
- `ADMIN_PIN_BOOTSTRAP` — the PIN used only the very first time the server starts (change it from the app's Admin controls panel afterwards)
- `GOOGLE_SHEET_WEBHOOK_URL` — optional, same as before

```bash
npm start        # production
npm run dev       # auto-restarts on file changes
```

The API listens on `http://localhost:4000` by default. The database file is
created automatically on first run at `backend/data/rdfd.sqlite` — back that
file up regularly (it's the entire register).

## API

| Method | Path                    | Auth   | Purpose |
|--------|-------------------------|--------|---------|
| GET    | `/api/health`           | none   | Liveness check |
| GET    | `/api/settings`         | none   | Read feature toggles |
| PATCH  | `/api/settings`         | admin  | Update toggles |
| POST   | `/api/entries`          | none   | Add a new entry (blocked if "accepting entries" is off) |
| GET    | `/api/entries`          | admin  | List entries (`?month=2026-08`, `?q=name`) |
| GET    | `/api/entries/summary`  | admin  | `{ count, grandTotal }` computed server-side |
| DELETE | `/api/entries/:id`      | admin  | Remove an entry |
| GET    | `/api/export/excel`     | admin  | Download the workbook, one sheet per month |
| POST   | `/api/auth/login`       | none   | `{ pin }` → `{ token }` (rate-limited) |
| POST   | `/api/auth/change-pin`  | admin  | `{ newPin }` |
| GET    | `/api/auth/me`          | admin  | Confirms a saved token is still valid |

Admin routes expect `Authorization: Bearer <token>`.

## Deploying

Any Node host works (Render, Railway, Fly.io, a VPS with PM2, etc.). Since
the database is a single file, make sure the host's filesystem persists
between deploys/restarts (or switch to a managed Postgres later if you
outgrow SQLite — the query layer is small enough to swap).

Point the frontend at your deployed URL by setting `VITE_API_URL` in the
frontend's `.env` before running `npm run build`.
