-- 001_init.sql — AME Monthly Church Reporting, Phase 1 schema.
-- Every tenant table carries district_id so cross-district access is
-- impossible by construction (all queries filter on the JWT's district).
--
-- Portability notes:
--   * No extension is required. UUIDs default to gen_random_uuid(): the
--     migration installs pgcrypto when available and otherwise defines a
--     fallback generator (md5() is core Postgres).
--   * Email uniqueness is case-insensitive via UNIQUE (district_id,
--     lower(email)) instead of the citext extension; all email lookups
--     compare lower(email).

-- UUID generation: prefer pgcrypto; fall back on minimal builds.
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pgcrypto;
EXCEPTION
  WHEN feature_not_supported THEN
    -- pgcrypto control file missing (minimal builds): md5() is core.
    CREATE OR REPLACE FUNCTION gen_random_uuid() RETURNS uuid
    LANGUAGE sql AS $func$
      SELECT md5(random()::text || clock_timestamp()::text || pg_backend_pid()::text)::uuid
    $func$;
END
$$;

CREATE TYPE user_role AS ENUM (
  'owner',
  'district_admin',
  'church_editor',
  'component_leader',
  'presiding_elder',
  'bishop'
);

CREATE TYPE report_status AS ENUM ('draft', 'submitted');
CREATE TYPE composite_status AS ENUM ('draft', 'finalized');
CREATE TYPE report_level AS ENUM ('church', 'district', 'conference', 'connectional');
CREATE TYPE calendar_level AS ENUM ('church', 'district', 'conference');

-- ---------------------------------------------------------------- districts
CREATE TABLE districts (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name               TEXT NOT NULL,
  license_tier       TEXT NOT NULL DEFAULT 'pilot',
  license_expires_at TIMESTAMPTZ,
  is_active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------- hierarchy tables
CREATE TABLE pe_districts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id UUID NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE annual_conferences (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id UUID NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE connectional_profile (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id UUID NOT NULL UNIQUE REFERENCES districts(id) ON DELETE CASCADE,
  profile     JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------- churches
CREATE TABLE churches (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id  UUID NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
  pe_district_id UUID REFERENCES pe_districts(id) ON DELETE SET NULL,
  name         TEXT NOT NULL,
  address      TEXT,
  city         TEXT,
  state        TEXT,
  zip          TEXT,
  phone        TEXT,
  email        TEXT,
  pastor_name  TEXT,
  pastor_email TEXT,
  pastor_phone TEXT,
  profile      JSONB NOT NULL DEFAULT '{}',
  is_sample    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------- components
CREATE TABLE components (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id UUID NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  UNIQUE (district_id, name)
);

-- -------------------------------------------------------------------- users
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id   UUID NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role          user_role NOT NULL,
  church_id     UUID REFERENCES churches(id) ON DELETE SET NULL,
  component_id  UUID REFERENCES components(id) ON DELETE SET NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Case-insensitive email uniqueness per district. (A separate CREATE UNIQUE
-- INDEX is used instead of a table-level UNIQUE (district_id, lower(email))
-- constraint for maximum build portability.)
CREATE UNIQUE INDEX users_district_email_uniq ON users (district_id, lower(email));

-- ---------------------------------------------------------- monthly reports
CREATE TABLE monthly_reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id UUID NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
  church_id   UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  year        INTEGER NOT NULL CHECK (year BETWEEN 2000 AND 2100),
  month       INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  data        JSONB NOT NULL DEFAULT '{}',
  status      report_status NOT NULL DEFAULT 'draft',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (church_id, year, month)
);

-- -------------------------------------------------------- component reports
CREATE TABLE component_reports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id  UUID NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
  component_id UUID NOT NULL REFERENCES components(id) ON DELETE CASCADE,
  church_id    UUID REFERENCES churches(id) ON DELETE CASCADE,
  level        report_level NOT NULL,
  year         INTEGER NOT NULL CHECK (year BETWEEN 2000 AND 2100),
  quarter      INTEGER NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  data         JSONB NOT NULL DEFAULT '{}',
  status       report_status NOT NULL DEFAULT 'draft',
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (component_id, church_id, level, year, quarter)
);

-- ---------------------------------------------------------- written reports
CREATE TABLE written_reports (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id        UUID NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
  scope_key          TEXT NOT NULL,
  church_id          UUID REFERENCES churches(id) ON DELETE CASCADE,
  level              report_level NOT NULL,
  year               INTEGER NOT NULL CHECK (year BETWEEN 2000 AND 2100),
  quarter            INTEGER NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  contributor_name   TEXT,
  activities         TEXT,
  events_held        TEXT,
  people_to_recognize TEXT,
  needs              TEXT,
  additional_notes   TEXT,
  submitted_by       TEXT,
  status             report_status NOT NULL DEFAULT 'draft',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX written_scope_idx
  ON written_reports (district_id, scope_key, level, year, quarter, status);

-- -------------------------------------------------------- composite reports
CREATE TABLE composite_reports (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id       UUID NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
  scope_key         TEXT NOT NULL,
  church_id         UUID REFERENCES churches(id) ON DELETE CASCADE,
  level             report_level NOT NULL,
  year              INTEGER NOT NULL CHECK (year BETWEEN 2000 AND 2100),
  quarter           INTEGER NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  report_date       TEXT,
  annual_year_label TEXT,
  theme_scripture   TEXT,
  addressees        TEXT,
  opening_paragraph TEXT,
  closing_paragraph TEXT,
  preparer_name     TEXT,
  preparer_title    TEXT,
  secretary_name    TEXT,
  pastor_name       TEXT,
  body              TEXT,
  status            composite_status NOT NULL DEFAULT 'draft',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (district_id, scope_key, level, year, quarter)
);

-- ---------------------------------------------------------- calendar events
CREATE TABLE calendar_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id UUID NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
  church_id   UUID REFERENCES churches(id) ON DELETE CASCADE,
  level       calendar_level NOT NULL,
  title       TEXT NOT NULL,
  starts_at   TIMESTAMPTZ NOT NULL,
  location    TEXT,
  description TEXT,
  contact     TEXT,
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX calendar_scope_idx
  ON calendar_events (district_id, level, starts_at);

-- ---------------------------------------------------------- refresh tokens
CREATE TABLE refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  family_id   UUID NOT NULL DEFAULT gen_random_uuid(),
  token_hash  TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX refresh_user_idx ON refresh_tokens (user_id);

-- ---------------------------------------------------------- password resets
CREATE TABLE password_resets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------ indexes
CREATE INDEX idx_users_district ON users (district_id);
CREATE INDEX idx_churches_district ON churches (district_id);
CREATE INDEX idx_components_district ON components (district_id);
CREATE INDEX idx_monthly_district ON monthly_reports (district_id);
CREATE INDEX idx_monthly_church ON monthly_reports (church_id, year, month);
CREATE INDEX idx_component_reports_district ON component_reports (district_id);
CREATE INDEX idx_written_district ON written_reports (district_id);
CREATE INDEX idx_composite_district ON composite_reports (district_id);
CREATE INDEX idx_calendar_district ON calendar_events (district_id);
CREATE INDEX idx_pe_districts_district ON pe_districts (district_id);
CREATE INDEX idx_conferences_district ON annual_conferences (district_id);
