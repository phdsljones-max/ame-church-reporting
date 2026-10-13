# AME Monthly Church Reporting — API Reference (Phase 1)

Base URL: `http://localhost:4000` (see `PORT` in `.env`). All routes below are
prefixed with `/api/v1` unless noted.

## Conventions

- **Auth:** Bearer access token in the `Authorization` header, except the
  `/auth/*` routes. Tokens expire after `ACCESS_TOKEN_TTL` (default `15m`).
- **Errors:** every failure returns `{ "error": { "code": "...", "message": "..." } }`
  with a plain-language message. Database/driver details are never exposed.
- **Casing:** JSON uses **camelCase** keys. Request bodies also accept
  snake_case equivalents (e.g. `licenseTier` or `license_tier`).
- **Lists:** every list endpoint returns `{ "items": [...] }`.
- **Tenant isolation:** every query filters on the district from your token.
  A resource from another district behaves as if it does not exist (404), so
  its existence never leaks. `church_editor` / `component_leader` are further
  narrowed to their own `churchId` / `componentId`.
- **License gate:** when a district is inactive or its license expired, `GET`
  (and exports) still work; `POST`/`PUT`/`PATCH`/`DELETE` return
  `403 { code: "LICENSE_INACTIVE", message: "This district's license is not
  active. Please contact Phoenix Rising AI Solutions." }`.
- **Roles:** `owner`, `district_admin`, `church_editor`, `component_leader`,
  `presiding_elder`, `bishop`. `presiding_elder` and `bishop` are read-only
  everywhere. The owner creates every account — there is no public signup.
- **License tiers:** `pilot` | `basic` | `standard` | `premium` (validated on
  create/update; anything else is rejected with `400 INVALID_TIER`). The seed
  uses `pilot`; the frontend tier select offers `basic`/`standard`/`premium`.

---

## Auth

### POST /api/v1/auth/login
Request: `{ "email": "...", "password": "..." }`
Response `200`:
```json
{
  "accessToken": "<jwt, 15m>",
  "refreshToken": "<opaque, 30d>",
  "user": { "id": "...", "email": "...", "role": "district_admin",
            "districtId": "...", "churchId": null, "componentId": null }
}
```
`401 INVALID_CREDENTIALS` when the email/password is wrong.

### POST /api/v1/auth/refresh
Request: `{ "refreshToken": "..." }` → `200` with a **rotated** pair
`{ accessToken, refreshToken, user }`. Reusing a revoked token revokes the
whole token family (`401 SESSION_EXPIRED`).

### POST /api/v1/auth/logout
Request: `{ "refreshToken": "..." }` (optional) → `200 { "ok": true }`.

### POST /api/v1/auth/request-password-reset
Request: `{ "email": "..." }` → always `200`
`{ "message": "If an account uses that email, a reset link was sent." }`
(The stub mailer logs the reset token to the server console.)

### POST /api/v1/auth/reset-password
Request: `{ "token": "...", "newPassword": "..." }` (min 8 chars, bcrypt cost 12)
→ `200 { "message": "Your password has been reset. Please sign in." }`.
All existing sessions are revoked.

## Me

### GET /api/v1/me
Response `200` — exactly:
```json
{ "id": "...", "email": "...", "role": "church_editor",
  "districtId": "...", "churchId": "...", "componentId": null }
```

### PATCH /api/v1/me/password
Request: `{ "currentPassword": "...", "newPassword": "..." }` → `200`
`{ "message": "Your password has been changed. Please sign in again." }`.

---

## Districts (owner license panel)

### GET /api/v1/districts
Owner: all districts. Others: their own district only.
→ `200 { "items": [District] }`
`District = { id, name, licenseTier, licenseExpiresAt, isActive, createdAt }`
(`licenseExpiresAt` is an ISO string or `null`.)

### GET /api/v1/districts/:id → `200 District` (404 for other districts unless owner).

### POST /api/v1/districts — owner only
Request: `{ "name": "...", "licenseTier": "standard", "licenseExpiresAt": "2027-10-10" }`
(`licenseTier` must be `pilot`|`basic`|`standard`|`premium`; `licenseExpiresAt` optional.)
Creates the district **and seeds the 13 standard components**.
→ `201 District`.

### PATCH /api/v1/districts/:id — owner only
Request: any of `{ name, licenseTier, licenseExpiresAt, isActive }`
→ `200 District`.

### GET /api/v1/districts/:id/overview — owner, or own district_admin
```json
{ "districtId": "...", "userCount": 12, "users": 12,
  "churchCount": 25, "churches": 25,
  "componentCount": 13, "monthlyReportCount": 300 }
```

### GET /api/v1/districts/:id/rollup?year=2026&quarter=4
Owner, district_admin, presiding_elder, bishop. Bottom-up aggregate:
```json
{
  "districtId": "...", "year": 2026, "quarter": 4, "months": [10, 11, 12],
  "totals": { "attendance": 5400 },
  "churches": [ { "churchId": "...", "churchName": "...",
                  "peDistrictId": "...", "peDistrictName": "...",
                  "totals": { "attendance": 600 },
                  "presentMonths": [10, 11], "missingMonths": [12] } ],
  "peDistricts": [ { "peDistrictId": "...", "name": "...",
                     "totals": { "attendance": 5400 }, "churchCount": 25 } ],
  "conference":   { "totals": { "attendance": 5400 }, "churchCount": 25 },
  "connectional": { "totals": { "attendance": 5400 }, "churchCount": 25 },
  "note": "Conference and connectional totals cover this district (single-district view)."
}
```

---

## Users (owner, district_admin)

`User = { id, districtId, email, role, churchId, componentId, isActive, createdAt }`
(password hashes are never returned).

### GET /api/v1/users → `200 { "items": [User] }`
Owner may pass `?districtId=`; district_admin always sees their own district.

### POST /api/v1/users
Request: `{ "email": "...", "password": "...", "role": "church_editor", "districtId": "...", "churchId": "...", "componentId": "..." }`
- `district_admin` may only create inside their own district and can never
  create `owner` accounts (`403` otherwise).
- `churchId`/`componentId` must belong to the district.
→ `201 User`. Duplicate email in the district → `400 EMAIL_TAKEN`.

### GET /api/v1/users/:id → `200 User`
### PATCH /api/v1/users/:id
Request: `{ "role"?, "isActive"?, "churchId"?, "componentId"? }` → `200 User`.
A district_admin cannot touch owner accounts; nobody can deactivate themselves.
### DELETE /api/v1/users/:id — deactivates the account (soft delete, keeps history) and revokes its sessions → `200 User`.

---

## Churches

`Church = { id, districtId, peDistrictId, name, address, city, state, zip, phone,
email, pastorName, pastorEmail, pastorPhone, profile, isSample, createdAt }`

### GET /api/v1/churches → `200 { "items": [Church] }`
`church_editor`/`component_leader` with a linked church see only that church.

### POST /api/v1/churches — owner, district_admin
Request: `{ name, address?, city?, state?, zip?, phone?, email?, pastorName?, pastorEmail?, pastorPhone?, peDistrictId?, profile? }` → `201 Church`.

### GET /api/v1/churches/:id → `200 Church`
### PATCH /api/v1/churches/:id — owner, district_admin → `200 Church`
### DELETE /api/v1/churches/:id — owner, district_admin (cascades to the church's reports) → `200 { ok: true }`

---

## Monthly reports

`MonthlyReport = { id, districtId, churchId, year, month, data, status, updatedAt }`
(`status` is `draft` or `submitted`; `data` is an object of fields.)

### GET /api/v1/churches/:churchId/monthly-reports?year=2026
→ `200 { "items": [MonthlyReport] }` ordered by year, month.

### GET /api/v1/churches/:churchId/monthly-reports/:year/:month
→ `200 MonthlyReport` (`404` when nothing was entered).

### PUT /api/v1/churches/:churchId/monthly-reports/:year/:month
Upsert. Request: `{ "data": { "attendance": 120 }, "status": "draft" }`
→ `200 MonthlyReport`.
- Writers: owner, district_admin, church_editor (own church only).
- Submitting a blank report → `400 { code: "BLANK_SUBMISSION",
  message: "Add at least one number or note before submitting." }`.

### DELETE /api/v1/churches/:churchId/monthly-reports/:year/:month
→ `200 { ok: true }`.

---

## Quarterly / annual rollups (server-side SQL)

### GET /api/v1/churches/:churchId/quarterly/:year/:quarter
```json
{
  "churchId": "...", "year": 2026, "quarter": 4, "months": [10, 11, 12],
  "totals": { "attendance": 600, "servicesHeld": 15 },
  "presentMonths": [10, 11], "missingMonths": [12],
  "auto": {
    "opening": 120, "openingSource": "profile",
    "accessions": 5, "transfersIn": 2, "transfersOut": 1, "deaths": 1,
    "closing": 125
  }
}
```
- `totals` sums **every numeric key** across the quarter's monthly `data`
  objects (JSON numbers and numeric strings both count).
- A missing month contributes nothing and appears in `missingMonths`.
- `auto` is the auto-computed membership:
  `closing = opening + accessions + transfersIn − transfersOut − deaths`.
  `opening` comes from the church profile key `opening_members_<year>`
  (also accepts `openingMembers_<year>`), else the previous year's computed
  closing, else `null` with `openingSource: "not_entered"` — unknown values
  stay `null` so the UI can show "Not entered".
- Delta keys accept snake_case or camelCase (`transfers_in`/`transfersIn`);
  the entry form's combined `transfers` key counts as transfers in.

### GET /api/v1/churches/:churchId/annual/:year
```json
{ "churchId": "...", "year": 2026, "totals": {...},
  "presentMonths": [...], "missingMonths": [...], "auto": {...},
  "quarters": [ { "quarter": 1, "months": [1,2,3], "missingMonths": [...], "totals": {...} }, ... ] }
```

---

## Annual setup (theme / scripture / goals)

Yearly planning per church and per component. **Blank by default**: `GET`
returns `{ theme: "", scripture: "", goals: [] }` until someone saves —
nothing is ever pre-filled.

`Goal = { id, text, target, progress, status }`
(`status`: `not_started` | `in_progress` | `complete`; `progress`: 0–100.)

### GET /api/v1/churches/:churchId/annual-setup/:year
church_editor (own church), district_admin, owner.
→ `200` the setup `{ id, districtId, churchId, year, theme, scripture, goals, updatedAt }`,
or the blank default `{ churchId, year, theme: "", scripture: "", goals: [] }`
when nothing is saved.

### PUT /api/v1/churches/:churchId/annual-setup/:year
Upsert. Request: `{ "theme": "...", "scripture": "...", "goals": [Goal] }`
(goal `id`s are assigned when omitted; invalid status/progress → `400 INVALID_GOALS`.)
→ `200 { id, districtId, churchId, year, theme, scripture, goals, updatedAt }`.

### GET /api/v1/component-annual-setup?componentId=&churchId=&level=&year=
component_leader (own component), church_editor (church-level setups for their
own church), district_admin, owner.
(`level`: `church`|`district`|`conference`|`connectional`, default `church`;
for `church` level, `churchId` defaults to the requester's church.)
→ `200` the setup `{ id, districtId, componentId, churchId, level, year, theme, scripture, goals, updatedAt }`,
or the blank default `{ componentId, churchId, level, year, theme: "", scripture: "", goals: [] }`.

### PUT /api/v1/component-annual-setup?componentId=&churchId=&level=&year=
Same identity params; body `{ theme, scripture, goals }` — upsert.
→ `200 { id, districtId, componentId, churchId, level, year, theme, scripture, goals, updatedAt }`.

---

## Hierarchy

### PE districts — GET/POST /api/v1/pe-districts, GET/PATCH/DELETE /api/v1/pe-districts/:id
`{ id, districtId, name, createdAt }`. Writes: owner, district_admin.
→ lists return `{ "items": [...] }`.

### Annual conferences — same shapes at /api/v1/annual-conferences.

### Connectional profile
- GET /api/v1/connectional-profile → `200 { districtId, profile }`
  (`profile` is `{}` when unset).
- PUT /api/v1/connectional-profile `{ profile }` — upsert, owner/district_admin.

---

## Components registry

`Component = { id, districtId, name, isActive, sortOrder }`

### GET /api/v1/components → `200 { "items": [Component] }`
### POST /api/v1/components `{ name, sortOrder? }` — owner, district_admin → `201 Component`
### PATCH /api/v1/components/:id `{ name?, isActive?, sortOrder? }` — owner, district_admin → `200 Component`
(New districts are seeded with the 13 standard AME components:
Board of Stewards, Board of Trustees, Stewardess Board, Board of Class
Leaders, Deaconess Board, Women's Missionary Society (WMS), Young People's
Division (YPD), Lay Organization, Sons of Allen, Richard Allen Young Adult
Council (RAYAC), Church School / Christian Education, Usher Board,
Music Ministry.)

---

## Component reports

`ComponentReport = { id, districtId, componentId, churchId, level, year, quarter, data, status, updatedAt }`

### PUT /api/v1/component-reports — upsert (the leader-entry path)
Request:
```json
{ "componentId": "...", "churchId": "...", "level": "church",
  "year": 2026, "quarter": 4,
  "data": { "attendance": 50 }, "status": "draft" }
```
- `component_leader` may only write their **own** component (`403` otherwise);
  owner/district_admin may write any.
- `level`: `church`|`district`|`conference`|`connectional` (default `church`).
  For `church` level, `churchId` defaults to the writer's church.
- Submitting a blank report → `400 BLANK_SUBMISSION`.
- Response `200` — the saved report:
```json
{ "id": "...", "districtId": "...", "componentId": "...", "churchId": "...",
  "level": "church", "year": 2026, "quarter": 4,
  "data": { "attendance": 50 }, "status": "draft", "updatedAt": "..." }
```

### GET /api/v1/component-reports?componentId=&churchId=&level=&year=&quarter=&status=
→ `200 { "items": [ComponentReport] }` (component_leader forced to own component).
### GET /api/v1/component-reports/:id → `200 ComponentReport`
### DELETE /api/v1/component-reports/:id → `200 { ok: true }`

---

## Written reports

`WrittenReport = { id, districtId, scopeKey, churchId, level, year, quarter,
contributorName, activities, eventsHeld, peopleToRecognize, needs,
additionalNotes, submittedBy, status, createdAt, updatedAt }`

Scope keys group contributions for composite assembly:
- `church:<churchId>` — a church's quarterly report
- `component:<componentId>` — a component's quarterly report
- `district` | `conference` | `connectional` — wider levels

### POST /api/v1/written-reports
Request: `{ scopeKey, churchId?, level, year, quarter, contributorName?, activities?, eventsHeld?, peopleToRecognize?, needs?, additionalNotes?, submittedBy?, status? }`
- church_editor: only `church:<ownChurchId>`; component_leader: only
  `component:<ownComponentId>`; owner/district_admin: anything in the district.
- Submitting a blank report → `400 BLANK_SUBMISSION`.
→ `201 WrittenReport`.

### GET /api/v1/written-reports?scopeKey=&churchId=&level=&year=&quarter=&status=
→ `200 { "items": [WrittenReport] }` (leaders narrowed to their own scope).
### GET /api/v1/written-reports/:id → `200 WrittenReport`
### PATCH /api/v1/written-reports/:id → `200 WrittenReport`
### DELETE /api/v1/written-reports/:id → `200 { ok: true }`

---

## Composite reports

`CompositeReport = { id, districtId, scopeKey, churchId, level, year, quarter,
reportDate, annualYearLabel, themeScripture, addressees, openingParagraph,
closingParagraph, preparerName, preparerTitle, secretaryName, pastorName,
body, status, createdAt, updatedAt }` (`status`: `draft` | `finalized`).

### POST /api/v1/composite-reports/assemble
Builds `body` from the scope's **submitted** written reports in contributor
order, plus the letterhead/theme/signature fields, and saves it as a draft
(upsert per scope/year/quarter).
Request:
```json
{ "scopeKey": "church:<id>", "churchId": "...", "level": "church",
  "year": 2026, "quarter": 4, "reportDate": "October 10, 2026",
  "annualYearLabel": "2025–2026", "themeScripture": "Psalm 133:1 (NIV)",
  "addressees": "Members of the Fourth Quarterly Conference",
  "openingParagraph": "...", "closingParagraph": "...",
  "preparerName": "...", "preparerTitle": "...",
  "secretaryName": "...", "pastorName": "..." }
```
- owner/district_admin, or church_editor for their own church's scope.
→ `200 CompositeReport` (includes the `id`).

### PATCH /api/v1/composite-reports/:id
Request: `{ status?: "draft"|"finalized", reportDate?, annualYearLabel?, themeScripture?, addressees?, openingParagraph?, closingParagraph?, preparerName?, preparerTitle?, secretaryName?, pastorName? }`
Setting `"status": "finalized"` is the finalize step. → `200 CompositeReport`.

### GET /api/v1/composite-reports/:id → `200 CompositeReport` (the rendered report).
### GET /api/v1/composite-reports?scopeKey=&level=&year=&quarter= → `200 { "items": [...] }`.

---

## Calendar

`CalendarEvent = { id, districtId, churchId, level, title, startsAt,
location, description, contact, createdBy, createdAt }`
(`level`: `church`|`district`|`conference`.)

### GET /api/v1/calendar-events?year=2026&level=&churchId=
Year-scoped listing → `200 { "items": [CalendarEvent] }`.
District/conference events are visible to all; church-level events are
narrowed to the requester's church for church/component roles.

### POST /api/v1/calendar-events
Request: `{ level, churchId?, title, startsAt, location?, description?, contact? }`
- Writers: owner, district_admin, church_editor (church-level, own church only).
→ `201 CalendarEvent`.

### GET /api/v1/calendar-events/:id → `200 CalendarEvent`
### PATCH /api/v1/calendar-events/:id → `200 CalendarEvent`
### DELETE /api/v1/calendar-events/:id → `200 { ok: true }`
Edit/delete: the creator, a church_editor of the event's church, a
district_admin, or the owner.

---

## Reconciliation

### GET /api/v1/reconciliation?churchId=&year=&quarter=
Owner, district_admin, presiding_elder, bishop (church_editor: own church).
Non-blocking flags where submitted component-report totals differ from the
pastor's monthly-report totals for the quarter:
```json
{ "churchId": "...", "year": 2026, "quarter": 4, "months": [10,11,12],
  "flags": [ { "key": "attendance", "componentTotal": 450,
               "pastorTotal": 600, "difference": -150,
               "note": "Component reports total 450 but the pastor's monthly reports total 600 for \"attendance\"." } ],
  "checkedAt": "..." }
```
Informational only — it never blocks submission.

---

## Exports (print-friendly HTML)

Brand header ("Phoenix Rising AI Solutions — Where Faith Meets the Future")
and footer ("© 2026 Phoenix Rising AI Solutions. All Rights Reserved.").
Available even when the district license is inactive.

- GET /api/v1/exports/quarterly/:churchId/:year/:quarter
- GET /api/v1/exports/annual/:churchId/:year
- GET /api/v1/exports/composite/:id
