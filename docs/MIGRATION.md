# Migration: single-owner artifact → multi-user platform (Phase 1)

The old app was a private single-owner artifact: roles were self-declared
strings, rollups were computed in the browser, and every mutation went
through local `save*` helpers. This document maps each old action to its
Phase 1 backend equivalent and calls out the behavior changes.

## Action map

| Old artifact action      | New API | Notes |
|--------------------------|---------|-------|
| `savechurch`             | `POST /api/v1/churches` (create) / `PATCH /api/v1/churches/:id` (update) | owner / district_admin only. |
| `savemonthlyreport`      | `PUT /api/v1/churches/:churchId/monthly-reports/:year/:month` `{data, status}` | Upsert. church_editor: own church. Blank submit → `400 BLANK_SUBMISSION`. |
| `savecomponentreport`    | `PUT /api/v1/component-reports` `{componentId, churchId?, level, year, quarter, data, status}` | **Upsert** (was create-or-overwrite locally). component_leader: own component only. Blank submit → `400 BLANK_SUBMISSION`. |
| `savewrittenreport`      | `POST /api/v1/written-reports` / `PATCH /api/v1/written-reports/:id` | Scoped by `scopeKey` (`church:<id>`, `component:<id>`, `district`, …). |
| `savecompositereport`    | `POST /api/v1/composite-reports/assemble` then `PATCH /api/v1/composite-reports/:id` `{status:"finalized"}` | Assemble builds `body` server-side from submitted written reports; finalize is an explicit status change (was a local flag). |
| `savecalendarevent`      | `POST /api/v1/calendar-events` / `PATCH /api/v1/calendar-events/:id` | Ownership: creator, own-church editor, district_admin, owner. Listing is year-scoped (`?year=`). |
| `savecomponent`          | `POST /api/v1/components` / `PATCH /api/v1/components/:id` | Registry is per district; the 13 standard components are seeded automatically. |
| `getreportingdata`       | `GET /api/v1/churches/:churchId/quarterly/:year/:quarter`, `GET /api/v1/churches/:churchId/annual/:year`, `GET /api/v1/districts/:id/rollup?year=&quarter=` | **Rollups moved server-side into SQL** (the audit finding). Missing months → `missingMonths` + `null` values ("Not entered"). |
| `deletechurch`           | `DELETE /api/v1/churches/:id` | Cascades to the church's reports (was local delete). |
| `deletecalendarevent`    | `DELETE /api/v1/calendar-events/:id` | Ownership-checked. |
| `seedsample`             | `npm run seed` (in `server/`) or `SEED=true` on boot | Single canonical seed at `server/seed/seed.ts`: creates "Sample Episcopal District (SAMPLE)" (tier `pilot`, 1-year license), "Sample AME Church (SAMPLE)" (`is_sample`), and the 13 components. A sample `district_admin` login is created **only** when `SEED_OWNER_EMAIL` + `SEED_OWNER_PASSWORD` are set. Never imports real data; idempotent. |

## Behavior changes to know about

1. **Roles are server-enforced.** The old app trusted a self-declared role
   string. Now every request carries a JWT; `presiding_elder`/`bishop` are
   read-only, `church_editor` is limited to their own church, and
   `component_leader` to their own component. Cross-district access is
   impossible by construction (all queries filter on the token's district).
2. **No public signup.** `POST /api/v1/users` is owner/district_admin only.
3. **License gating.** Inactive/expired district → writes return
   `403 LICENSE_INACTIVE`; reads and exports keep working.
4. **Status workflow.** Monthly, component, and written reports use
   `draft` → `submitted`; composites use `draft` → `finalized`.
5. **Annual setup is new** (no old equivalent): per-church and per-component
   yearly theme/scripture/goals at `/annual-setup` routes. Blank by default —
   the API never pre-fills.
6. **JSON is camelCase** (the old artifact used mixed casing). Request bodies
   accept snake_case equivalents.
7. **Errors are plain-language** `{error:{code,message}}`; SQL/driver
   messages never reach the client.

## Data import

There is no automated import from the old artifact. If historical data needs
carrying over, the path is: create districts/churches/users via the API,
then `PUT` the monthly/component rows per period. Talk to the backend
engineer before scripting a bulk import so tenant scoping stays intact.
