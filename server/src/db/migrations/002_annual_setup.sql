-- 002_annual_setup.sql — yearly planning: theme, scripture, and goals per
-- church and per component. Blank by default: the API never pre-fills
-- theme/scripture/goals; it returns empty values until someone saves them.
--
-- Goal objects look like:
--   [{ "id": "<uuid>", "text": "...", "target": "...", "progress": 0,
--      "status": "not_started" | "in_progress" | "complete" }]

CREATE TABLE church_annual_setup (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id UUID NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
  church_id   UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  year        INTEGER NOT NULL CHECK (year BETWEEN 2000 AND 2100),
  theme       TEXT NOT NULL DEFAULT '',
  scripture   TEXT NOT NULL DEFAULT '',
  goals       JSONB NOT NULL DEFAULT '[]',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (church_id, year)
);
CREATE INDEX idx_church_setup_district ON church_annual_setup (district_id);

CREATE TABLE component_annual_setup (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id  UUID NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
  component_id UUID NOT NULL REFERENCES components(id) ON DELETE CASCADE,
  church_id    UUID REFERENCES churches(id) ON DELETE CASCADE,
  level        report_level NOT NULL,
  year         INTEGER NOT NULL CHECK (year BETWEEN 2000 AND 2100),
  theme        TEXT NOT NULL DEFAULT '',
  scripture    TEXT NOT NULL DEFAULT '',
  goals        JSONB NOT NULL DEFAULT '[]',
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (component_id, church_id, level, year)
);
CREATE INDEX idx_component_setup_lookup
  ON component_annual_setup (district_id, component_id, level, year);
