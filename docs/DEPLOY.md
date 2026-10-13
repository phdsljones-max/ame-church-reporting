# Deploy — AME Monthly Church Reporting (Phase 1)

How to put the platform on the public internet. Three supported hosts:
**Render**, **Railway**, **Fly.io**. Pick one — the steps are the same shape
everywhere: (1) create a managed Postgres, (2) deploy the API, (3) run
migrations + seed once, (4) deploy the web app, (5) point the web app at the
API.

**Do not deploy anything yourself from these notes without the owner's
go-ahead** — production needs real secrets, a real mailer, and backups
(see `docs/SECURITY.md`).

© 2026 Phoenix Rising AI Solutions. All Rights Reserved.  
*Where Faith Meets the Future.*

---

## 0. What you are deploying

| Piece | Tech | Default port | Source dir |
|---|---|---|---|
| API | Node 20 + Express + TypeScript | `4000` (`PORT`) | `server/` |
| Database | PostgreSQL 16 | `5432` | managed addon |
| Web app | Vite + React (static files) | dev `5173` | `web/` |

The API serves JSON at `/api/v1/...` plus `GET /health`. The web app is a
static build (`web/dist`) that talks to the API URL in `VITE_API_URL`.

Environment variables the API needs (see `.env.example` at the repo root):

| Variable | Example | Notes |
|---|---|---|
| `DATABASE_URL` | `postgresql://user:pass@host:5432/db` | From the Postgres addon |
| `JWT_ACCESS_SECRET` | 96-hex-char random | `openssl rand -hex 48`; unique per deploy |
| `JWT_REFRESH_SECRET` | 96-hex-char random | **Different** from the access secret |
| `ACCESS_TOKEN_TTL` | `15m` | Keep short |
| `REFRESH_TOKEN_TTL` | `30d` | |
| `PORT` | `4000` | Hosts inject this automatically — do not hardcode |
| `WEB_ORIGIN` | `https://app.example.org` | Exact web origin, no trailing slash (CORS) |
| `MAILER` | `stub` | Dev only — configure a real provider before launch |

First-deploy database setup (run once, in this order):

```bash
npm run migrate --workspace=server   # creates tables (idempotent)
npm run seed --workspace=server       # sample district + church + 13 components
```

`npm run seed` creates the "Sample Episcopal District (SAMPLE)" with a
1-year pilot license. It creates a sample `district_admin` login **only**
if `SEED_OWNER_EMAIL` and `SEED_OWNER_PASSWORD` are set — leave them empty
in production and create real accounts via `POST /api/v1/users`.

> Note: `docs/API.md` and `docs/MIGRATION.md` (endpoint reference and
> migration history) are maintained by the backend track — read them
> alongside this guide for the full route list.

---

## Option A — Render

1. **Postgres:** Dashboard → New → PostgreSQL. Note the *Internal
   Database URL* (the API and database live in the same private network).
   Turn on automated backups (Settings → Backups).
2. **API (Web Service):** New → Web Service → connect the repo.
   - Build command: `npm install --workspaces && npm run build --workspace=server`
   - Start command: `npm run start --workspace=server`
   - Environment: add every variable from the table above; set
     `DATABASE_URL` to the Internal Database URL.
3. **Migrate + seed:** after the first deploy, open the service's
   **Shell** tab and run:
   ```bash
   npm run migrate --workspace=server
   npm run seed --workspace=server
   ```
   (Migrations are tracked in `schema_migrations` — safe to re-run.)
4. **Web app (Static Site):** New → Static Site → same repo.
   - Build command: `npm install --workspaces && npm run build --workspace=web`
   - Publish directory: `web/dist`
   - Environment: `VITE_API_URL=https://<your-api>.onrender.com`
     (Vite bakes this in at build time — rebuild after changing it.)
5. **Wire them together:** set the API service's `WEB_ORIGIN` to the
   static site's URL (e.g. `https://ame-reports.onrender.com`), then
   redeploy the API. HTTPS is automatic on `*.onrender.com`.

## Option B — Railway

1. **Postgres:** New → Database → PostgreSQL. Railway injects
   `DATABASE_URL` into every service in the project automatically.
2. **API service:** New → GitHub Repo → select the repo; set the
   **root directory** to `server/` (or keep repo root and use workspace
   commands). Set start command `npm run start --workspace=server` and
   build `npm run build --workspace=server`. Add the env vars from the
   table (skip `DATABASE_URL` — injected; add `PORT` only if you want a
   fixed value).
3. **Migrate + seed:** in the API service, open a one-off shell
   (service → … → "Run a command") and run the two commands from
   section 0.
4. **Web app service:** New → GitHub Repo → same repo, root directory
   `web/`. Build `npm run build`, output `dist`. Add
   `VITE_API_URL=https://<api>.up.railway.app`. Railway serves static
   sites over HTTPS automatically.
5. Set `WEB_ORIGIN` on the API service to the web service's public URL
   and redeploy the API.

## Option C — Fly.io

1. **Postgres:** `fly postgres create --name ame-reports-db` (pick a
   region near your users). Enable backups: `fly postgres backup`
   schedule per the docs.
2. **API app:** from the repo root:
   ```bash
   fly launch --name ame-reports-api   # choose "no" when asked to deploy yet
   fly postgres attach --app ame-reports-api ame-reports-db   # sets DATABASE_URL
   fly secrets set JWT_ACCESS_SECRET="$(openssl rand -hex 48)" \
     JWT_REFRESH_SECRET="$(openssl rand -hex 48)" \
     ACCESS_TOKEN_TTL=15m REFRESH_TOKEN_TTL=30d \
     WEB_ORIGIN="https://<web-host>" MAILER=stub \
     --app ame-reports-api
   ```
   Make sure the Dockerfile (or buildpack) runs
   `npm run build --workspace=server` and starts with
   `npm run start --workspace=server`, listening on `$PORT`
   (the server already reads `PORT`).
3. **Migrate + seed (one-off machine):**
   ```bash
   fly ssh console --app ame-reports-api -C "npm run migrate --workspace=server"
   fly ssh console --app ame-reports-api -C "npm run seed --workspace=server"
   ```
4. **Web app:** `fly launch --name ame-reports-web` with a static
   file server for `web/dist` (or deploy to Fly Static). Build with
   `VITE_API_URL=https://ame-reports-api.fly.dev` in the environment.
5. Fly terminates TLS automatically — both apps get HTTPS.

---

## PWA / install note

The web app ships as an installable PWA (manifest + service worker +
icons in `web/public/`, install prompt in `web/src/pwa/`). Browsers only
offer **Add to Home Screen** on a secure origin: `https://` or
`http://localhost`. All three hosts above give you HTTPS by default —
keep it that way and do not serve the app over plain HTTP in production.
See `docs/PWA.md` for the install flow.

## After every deploy

- `GET https://<api>/health` → `{"ok":true}`
- Sign in to the web app and confirm the API base URL is correct
  (a wrong `VITE_API_URL` shows as failed sign-in / network errors).
- After changing any `VITE_*` variable, **rebuild** the web app.
- After changing `WEB_ORIGIN`, redeploy the API.
