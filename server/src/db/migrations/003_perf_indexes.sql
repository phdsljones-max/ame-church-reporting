-- 003_perf_indexes.sql — composite indexes so district-scale rollups stay
-- comfortable (25+ churches plus auxiliaries). The quarterly/annual rollups
-- filter monthly_reports by (district_id, year, month) and the
-- reconciliation/component aggregates filter component_reports by
-- (district_id, church_id, level, year, quarter). Each of those predicates
-- is now served by a single index scan.

DROP INDEX IF EXISTS idx_monthly_district;
CREATE INDEX IF NOT EXISTS idx_monthly_district_ym
  ON monthly_reports (district_id, year, month);

DROP INDEX IF EXISTS idx_component_reports_district;
CREATE INDEX IF NOT EXISTS idx_component_reports_lookup
  ON component_reports (district_id, church_id, level, year, quarter);

CREATE INDEX IF NOT EXISTS idx_written_district_level
  ON written_reports (district_id, level, year, quarter);
