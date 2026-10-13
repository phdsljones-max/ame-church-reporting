# AME Monthly Church Reporting — Multi-User Platform (Phase 1)

Production codebase for the multi-user hosted version of the AME Monthly Church
Reporting app. Each Episcopal District is a tenant: churches enter monthly
numbers, months roll into quarterly reports, quarters feed the annual
Connectional reports — information flowing bottom-up from churches through PE
Districts and Annual Conferences to the Connectional level.

© 2026 Phoenix Rising AI Solutions. All Rights Reserved.

## Repository layout

```
ame-reporting-platform/
├── docker-compose.yml      # local PostgreSQL 16
├── .env.example            # all config; copy to .env (never commit secrets)
├── package.json            # npm workspaces: server, web
├── server/                 # Node 20 + TypeScript + Express + node-postgres
│   ├── src/                # app, routes, middleware, db, lib
│   ├── src/db/migrations/  # 001_init, 002_annual_setup, 003_perf_indexes
│   ├── seed/seed.ts        # idempotent sample-data seed
│   └── test/               # vitest: auth-scoping, rollups, license, annual-setup
├── web/                    # Vite + React + TypeScript PWA
│   ├── src/pages/          # login, dashboard, monthly, quarterly, annual,
│   │                       # components, written-reports, composite, calendar,
│   │                       # annual-setup, guide, admin/users, admin/districts
│   ├── src/lib/liturgical.ts  # Gregorian computus + church-year data
│   ├── src/pwa/            # service-worker registration + install prompt
│   └── public/             # manifest.json, icons/, sw.js
├── docs/
│   ├── API.md              # every route, auth, request/response shapes
│   ├── MIGRATION.md        # old artifact actions → new schema/routes
│   ├── DEPLOY.md           # Render / Railway / Fly.io walkthroughs
│   ├── SECURITY.md         # threat model + owner operations checklist
│   └── PWA.md              # installable web app notes
└── tools/verify.sh         # typecheck + tests, PASS/FAIL summary
```

## Quick start (local)

Prerequisites: Node 20+, Docker (for Postgres) — or any reachable PostgreSQL 16+.

```bash
# 1. Database
docker compose up -d db            # or: create db "amereports" yourself

# 2. Configure
cp .env.example .env               # fill in DATABASE_URL + JWT secrets
# generate secrets:  openssl rand -hex 48

# 3. Install, migrate, seed
npm install
npm run build:server
cd server && npm run migrate && npm run seed && cd ..

# 4. Run
npm run dev:server                 # API on http://localhost:4000
cd web && npm run dev              # app on http://localhost:5173 (proxies /api)
```

Open http://localhost:5173, log in with the seeded owner account
(set `SEED_OWNER_EMAIL` / `SEED_OWNER_PASSWORD` before seeding to create one).

## Tests

```bash
cd server && DATABASE_URL=postgresql://amereports:amereports@localhost:5432/amereports_test npm run test
# or everything at once:
bash tools/verify.sh
```

Suites: **auth-scoping** (cross-district access impossible; role gates),
**rollups** (quarter = sum of 3 months, annual = sum of 4 quarters, missing
months reported), **license** (expired district: reads OK, writes 403
`LICENSE_INACTIVE`), **annual-setup**.

## Key design decisions

- **Multi-tenancy:** every table carries `district_id`; every query is scoped
  from the authenticated user. Cross-district access is impossible by
  construction — this fixes the old app's self-declared roles.
- **Auth:** bcrypt (cost 12), 15-minute JWT access tokens + rotating refresh
  tokens with reuse detection. The owner creates all accounts; no public signup.
- **Rollups computed server-side in SQL** (the old app did this client-side).
  Unknown values are reported honestly as "Not entered", never silent zeros.
- **License gating:** expired/inactive district → reads and exports allowed,
  writes blocked with a plain-language message.
- **PWA:** installable web app (manifest, icons, service worker, install
  prompt). No native wrapper, no store submission. Requires HTTPS in production.
- **Brand:** burgundy/gold theme, "Phoenix Rising AI Solutions" +
  "Where Faith Meets the Future" in the header, copyright footer on every page
  and report export.

## Deploying

Phase 1 stops at a working codebase — nothing here is deployed. When ready,
follow [docs/DEPLOY.md](docs/DEPLOY.md) (Render / Railway / Fly.io), then
[docs/SECURITY.md](docs/SECURITY.md)'s owner checklist (secrets, HTTPS,
backups, real mailer).

## Phase 2 (not started)

Deploy to her hosting account, point a subdomain at it, pilot in her own
district, then license to other districts via the owner license panel.
