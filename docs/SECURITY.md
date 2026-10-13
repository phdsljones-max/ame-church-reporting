# Security — AME Monthly Church Reporting (Phase 1)

Plain-language guide for the owner (Phoenix Rising AI Solutions) and for
anyone reviewing the code. Short version: real logins, short-lived tokens,
every database query is locked to your district, and errors never leak
technical details.

© 2026 Phoenix Rising AI Solutions. All Rights Reserved.  
*Where Faith Meets the Future.*

---

## 1. The threat model (who we protect against)

- **Curious or malicious users inside the system.** A church editor at
  Church A must never see or change Church B's numbers; a component leader
  must only touch their own component's reports; a presiding elder is
  read-only everywhere.
- **Cross-district snooping.** When the platform hosts more than one
  Episcopal district, District A's people must never reach District B's
  data — not even by guessing a URL.
- **Stolen tokens.** If someone copies a login token, it stops working
  within 15 minutes, and refresh-token theft is detected and burns the
  whole token family.
- **Expired licenses.** If a district's license lapses, nobody can keep
  writing data for free — writes stop, reads and exports keep working so
  nothing is ever held hostage.
- **Password guessing.** Passwords are stored with bcrypt (cost 12) and
  there is no public signup page — the owner creates every account.

## 2. How authentication works

- **No public signup.** Accounts are created only by the owner or a
  district admin through `POST /api/v1/users`. There is no
  self-registration endpoint at all.
- **Passwords:** hashed with **bcrypt, cost factor 12** before storage.
  The plain password is never stored, never logged, never returned by the
  API. Minimum length: 8 characters.
- **Access tokens (JWT):** valid for **15 minutes** (`ACCESS_TOKEN_TTL`).
  Sent as `Authorization: Bearer <token>`. Every request re-loads the user
  and their district's license state from the database, so deactivating an
  account or expiring a license takes effect immediately.
- **Refresh tokens:** valid for 30 days (`REFRESH_TOKEN_TTL`), stored in
  the database as **SHA-256 hashes** (the raw token only ever exists in the
  user's browser). Each refresh **rotates**: the old token is revoked and a
  new one issued. **Reuse detection:** if a revoked token is presented
  again (a sign it was copied), the entire token family is revoked and the
  user must sign in fresh.
- **Password reset:** request always returns the same message whether or
  not the email exists (no account enumeration). Reset tokens are
  single-use, expire in 1 hour, and completing a reset revokes all of that
  user's refresh tokens.

## 3. How authorization works (roles & district scoping)

- **District scoping on every query.** The access token carries only the
  user id; the server loads `districtId` from the database and every
  tenant table (`churches`, `components`, `monthly_reports`,
  `component_reports`, `written_reports`, `composite_reports`,
  `calendar_events`, `users`) is filtered with `WHERE district_id = $1`.
  Reading another district's data returns 404 ("we could not find that"),
  which never reveals whether the row exists.
- **Roles:** `owner` > `district_admin` > `church_editor` /
  `component_leader`, plus read-only `presiding_elder` and `bishop`.
  - `church_editor` reads/writes only their linked church.
  - `component_leader` reads/writes only their linked component's reports.
  - `presiding_elder` and `bishop` cannot POST/PUT/PATCH/DELETE anything —
    writes are rejected with 403.
- **License gating:** if the district is inactive or its license expired,
  `GET` (reads) and exports still return 200; every write
  (POST/PUT/PATCH/DELETE) returns **403 `LICENSE_INACTIVE`** with a
  plain-language message. Nobody's data is ever locked away.
- **Plain-language errors.** Database and driver messages are never sent
  to the client — a raw SQL error (e.g. a bad id) becomes a friendly
  message like "We could not find that." Internals are logged
  server-side only.

## 4. What the owner must do (operations checklist)

1. **Strong secrets.** Generate fresh values for `JWT_ACCESS_SECRET` and
   `JWT_REFRESH_SECRET` (e.g. `openssl rand -hex 48`); the two must differ.
   Never reuse, never commit them, never share them.
2. **HTTPS everywhere.** The web app and API must be served over HTTPS in
   production (Render/Railway/Fly do this automatically). The PWA install
   prompt also requires HTTPS.
3. **Restrict CORS.** Set `WEB_ORIGIN` to the exact production web origin
   (no trailing slash) — never `*`.
4. **Database backups.** Turn on automated backups for the managed
   Postgres instance (daily, 7–30 day retention). Test a restore before
   onboarding the first real district.
5. **Real mailer before launch.** `MAILER=stub` logs password-reset tokens
   to the server console — fine for development, not for production.
   Implement the `Mailer` interface (SendGrid/SES/Postmark) before real
   users arrive.
6. **Least privilege.** Keep `owner` accounts to a minimum; district staff
   get `district_admin`, never `owner`.
7. **Rotate on suspicion.** If a secret may have leaked, generate a new one
   and redeploy — all sessions signed with the old secret stop working.
8. **Review licenses.** The owner license panel (`GET /api/v1/districts/:id/overview`)
   shows counts per district; deactivate districts that stop paying.

## 5. Known Phase 1 limitations (be honest about them)

- Refresh tokens are stored server-side, so horizontal scaling needs a
  shared database (already the case) — no sticky sessions required.
- Rate limiting is not yet implemented; add it (or a WAF rule) before
  opening the API to the public internet at scale.
- The stub mailer must be replaced (see item 5 above).
- Audit logging of who-changed-what is not yet implemented; consider it
  for Phase 2.
