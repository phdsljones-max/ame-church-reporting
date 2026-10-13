import type { Pool } from 'pg';

/**
 * Server-side rollup computation in SQL. The previous single-owner app
 * computed these client-side; the audit flagged that, so every total here
 * is produced by the database. Missing months contribute nothing and are
 * reported in missingMonths so the UI can show "Not entered".
 */

export function quarterMonths(quarter: number): [number, number, number] {
  const start = (quarter - 1) * 3 + 1;
  return [start, start + 1, start + 2];
}

export interface PeriodTotals {
  totals: Record<string, number>;
  presentMonths: number[];
  missingMonths: number[];
}

export interface MembershipAuto {
  opening: number | null;
  openingSource: 'profile' | 'prior_year_end' | 'not_entered';
  accessions: number;
  transfersIn: number;
  transfersOut: number;
  deaths: number;
  closing: number | null;
}

/** Numeric JSON value, accepting both JSON numbers and numeric strings. */
function numOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value.trim())) return Number(value);
  return null;
}

/**
 * Sum every numeric JSONB key across the given months.
 * A missing month contributes nothing and lands in missingMonths.
 */
export async function sumMonthlyNumeric(
  db: Pool,
  districtId: string,
  churchId: string,
  year: number,
  months: number[]
): Promise<PeriodTotals> {
  const { rows } = await db.query(
    `SELECT kv.key AS key,
            SUM(CASE
                  WHEN jsonb_typeof(kv.value) = 'number' THEN (kv.value #>> '{}')::numeric
                  WHEN jsonb_typeof(kv.value) = 'string'
                   AND (kv.value #>> '{}') ~ '^-?\\d+(\\.\\d+)?$'
                    THEN (kv.value #>> '{}')::numeric
                  ELSE NULL
                END) AS total
       FROM monthly_reports m
       CROSS JOIN LATERAL jsonb_each(m.data) AS kv
      WHERE m.district_id = $1
        AND m.church_id = $2
        AND m.year = $3
        AND m.month = ANY($4::int[])
      GROUP BY kv.key`,
    [districtId, churchId, year, months]
  );

  const present = await db.query(
    `SELECT month FROM monthly_reports
      WHERE district_id = $1 AND church_id = $2 AND year = $3 AND month = ANY($4::int[])`,
    [districtId, churchId, year, months]
  );
  const presentMonths: number[] = present.rows
    .map((r: { month: number }) => r.month)
    .sort((a: number, b: number) => a - b);
  const missingMonths = months.filter((m) => !presentMonths.includes(m));

  const totals: Record<string, number> = {};
  for (const row of rows as { key: string | null; total: string | null }[]) {
    if (row.key != null && row.total != null) totals[row.key] = Number(row.total);
  }
  return { totals, presentMonths, missingMonths };
}

/**
 * Auto membership for a period:
 *   closing = opening + accessions + transfersIn - transfersOut - deaths
 * Opening comes from the church profile key `opening_members_<year>`
 * (or `openingMembers_<year>`), else from the previous year's computed
 * closing, else it is unknown ("not_entered").
 * Deltas accept snake_case or camelCase monthly keys; the combined
 * `transfers` key (used by the entry form) counts as transfers in.
 */
export async function membershipForPeriod(
  db: Pool,
  districtId: string,
  churchId: string,
  year: number,
  months: number[],
  depth = 0
): Promise<MembershipAuto> {
  const churchRes = await db.query(
    'SELECT profile FROM churches WHERE id = $1 AND district_id = $2',
    [churchId, districtId]
  );
  const profile = (churchRes.rows[0]?.profile ?? {}) as Record<string, unknown>;

  let opening: number | null =
    numOrNull(profile[`opening_members_${year}`]) ??
    numOrNull(profile[`openingMembers_${year}`]) ??
    numOrNull(profile[`openingMembers${year}`]);
  let openingSource: MembershipAuto['openingSource'] = 'not_entered';

  if (opening != null) {
    openingSource = 'profile';
  } else if (depth < 4) {
    const prior = await membershipForPeriod(
      db,
      districtId,
      churchId,
      year - 1,
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      depth + 1
    );
    if (prior.closing != null) {
      opening = prior.closing;
      openingSource = 'prior_year_end';
    }
  }

  const { totals } = await sumMonthlyNumeric(db, districtId, churchId, year, months);
  const pick = (...keys: string[]): number => {
    for (const key of keys) {
      const n = numOrNull(totals[key]);
      if (n != null) return n;
    }
    return 0;
  };
  const accessions = pick('accessions');
  const transfersIn = pick('transfersIn', 'transfers_in', 'transfers');
  const transfersOut = pick('transfersOut', 'transfers_out');
  const deaths = pick('deaths');
  const closing = opening == null ? null : opening + accessions + transfersIn - transfersOut - deaths;

  return { opening, openingSource, accessions, transfersIn, transfersOut, deaths, closing };
}

export interface QuarterlyRollup extends PeriodTotals {
  churchId: string;
  year: number;
  quarter: number;
  months: number[];
  auto: MembershipAuto;
}

export async function quarterlyRollup(
  db: Pool,
  districtId: string,
  churchId: string,
  year: number,
  quarter: number
): Promise<QuarterlyRollup> {
  const months = quarterMonths(quarter);
  const period = await sumMonthlyNumeric(db, districtId, churchId, year, months);
  const auto = await membershipForPeriod(db, districtId, churchId, year, months);
  return {
    churchId,
    year,
    quarter,
    months: [...months],
    totals: period.totals,
    presentMonths: period.presentMonths,
    missingMonths: period.missingMonths,
    auto,
  };
}

export interface AnnualRollup {
  churchId: string;
  year: number;
  totals: Record<string, number>;
  presentMonths: number[];
  missingMonths: number[];
  auto: MembershipAuto;
  quarters: { quarter: number; months: number[]; missingMonths: number[]; totals: Record<string, number> }[];
}

const ALL_MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export async function annualRollup(
  db: Pool,
  districtId: string,
  churchId: string,
  year: number
): Promise<AnnualRollup> {
  const totals: Record<string, number> = {};
  const presentMonths: number[] = [];
  const missingMonths: number[] = [];
  const quarters: AnnualRollup['quarters'] = [];

  for (let quarter = 1; quarter <= 4; quarter++) {
    const months = quarterMonths(quarter);
    const period = await sumMonthlyNumeric(db, districtId, churchId, year, months);
    quarters.push({
      quarter,
      months: [...months],
      missingMonths: period.missingMonths,
      totals: period.totals,
    });
    for (const [key, value] of Object.entries(period.totals)) {
      totals[key] = (totals[key] ?? 0) + value;
    }
    presentMonths.push(...period.presentMonths);
    missingMonths.push(...period.missingMonths);
  }

  const auto = await membershipForPeriod(db, districtId, churchId, year, ALL_MONTHS);
  return {
    churchId,
    year,
    totals,
    presentMonths: presentMonths.sort((a, b) => a - b),
    missingMonths: missingMonths.sort((a, b) => a - b),
    auto,
    quarters,
  };
}

export interface DistrictRollup {
  districtId: string;
  year: number;
  quarter: number;
  months: number[];
  /** Conference-level totals (whole district), duplicated here for convenience. */
  totals: Record<string, number>;
  churches: {
    churchId: string;
    churchName: string;
    peDistrictId: string | null;
    peDistrictName: string | null;
    totals: Record<string, number>;
    presentMonths: number[];
    missingMonths: number[];
  }[];
  peDistricts: {
    peDistrictId: string | null;
    name: string | null;
    totals: Record<string, number>;
    churchCount: number;
  }[];
  conference: { totals: Record<string, number>; churchCount: number };
  connectional: { totals: Record<string, number>; churchCount: number };
  note: string;
}

/**
 * Bottom-up rollup for elder/bishop views:
 * churches -> PE districts -> annual conference -> connectional.
 * (One district row backs one annual conference in this schema, so
 * conference and connectional totals cover the district.)
 */
export async function districtRollup(
  db: Pool,
  districtId: string,
  year: number,
  quarter: number
): Promise<DistrictRollup> {
  const months = quarterMonths(quarter);

  const { rows: churches } = await db.query(
    `SELECT c.id, c.name, c.pe_district_id, pd.name AS pe_district_name
       FROM churches c
       LEFT JOIN pe_districts pd ON pd.id = c.pe_district_id
      WHERE c.district_id = $1
      ORDER BY c.name`,
    [districtId]
  );

  const { rows: sums } = await db.query(
    `SELECT m.church_id AS church_id,
            kv.key AS key,
            SUM(CASE
                  WHEN jsonb_typeof(kv.value) = 'number' THEN (kv.value #>> '{}')::numeric
                  WHEN jsonb_typeof(kv.value) = 'string'
                   AND (kv.value #>> '{}') ~ '^-?\\d+(\\.\\d+)?$'
                    THEN (kv.value #>> '{}')::numeric
                  ELSE NULL
                END) AS total
       FROM monthly_reports m
       CROSS JOIN LATERAL jsonb_each(m.data) AS kv
      WHERE m.district_id = $1
        AND m.year = $2
        AND m.month = ANY($3::int[])
      GROUP BY m.church_id, kv.key`,
    [districtId, year, months]
  );

  const { rows: presentRows } = await db.query(
    `SELECT church_id, array_agg(DISTINCT month) AS months
       FROM monthly_reports
      WHERE district_id = $1 AND year = $2 AND month = ANY($3::int[])
      GROUP BY church_id`,
    [districtId, year, months]
  );
  const presentByChurch = new Map<string, number[]>(
    presentRows.map((r: { church_id: string; months: number[] }) => [r.church_id, [...r.months].sort((a, b) => a - b)])
  );
  const totalsByChurch = new Map<string, Record<string, number>>();
  for (const row of sums as { church_id: string; key: string | null; total: string | null }[]) {
    if (row.key == null || row.total == null) continue;
    const entry = totalsByChurch.get(row.church_id) ?? {};
    entry[row.key] = Number(row.total);
    totalsByChurch.set(row.church_id, entry);
  }

  const churchRollups = churches.map(
    (c: { id: string; name: string; pe_district_id: string | null; pe_district_name: string | null }) => {
      const presentMonths = presentByChurch.get(c.id) ?? [];
      return {
        churchId: c.id,
        churchName: c.name,
        peDistrictId: c.pe_district_id,
        peDistrictName: c.pe_district_name,
        totals: totalsByChurch.get(c.id) ?? {},
        presentMonths,
        missingMonths: months.filter((m) => !presentMonths.includes(m)),
      };
    }
  );

  const peMap = new Map<string | null, { name: string | null; totals: Record<string, number>; churchCount: number }>();
  const conferenceTotals: Record<string, number> = {};
  for (const church of churchRollups) {
    const key = church.peDistrictId;
    let bucket = peMap.get(key);
    if (!bucket) {
      bucket = { name: church.peDistrictName, totals: {}, churchCount: 0 };
      peMap.set(key, bucket);
    }
    bucket.churchCount += 1;
    for (const [k, v] of Object.entries(church.totals)) {
      bucket.totals[k] = (bucket.totals[k] ?? 0) + v;
      conferenceTotals[k] = (conferenceTotals[k] ?? 0) + v;
    }
  }

  const peDistricts = [...peMap.entries()].map(([peDistrictId, bucket]) => ({
    peDistrictId,
    name: bucket.name,
    totals: bucket.totals,
    churchCount: bucket.churchCount,
  }));

  return {
    districtId,
    year,
    quarter,
    months: [...months],
    totals: conferenceTotals,
    churches: churchRollups,
    peDistricts,
    conference: { totals: conferenceTotals, churchCount: churchRollups.length },
    connectional: { totals: conferenceTotals, churchCount: churchRollups.length },
    note: 'Conference and connectional totals cover this district (single-district view).',
  };
}

/** Component-report totals for reconciliation (submitted reports only). */
export async function sumComponentReports(
  db: Pool,
  districtId: string,
  churchId: string,
  year: number,
  quarter: number
): Promise<Record<string, number>> {
  const { rows } = await db.query(
    `SELECT kv.key AS key,
            SUM(CASE
                  WHEN jsonb_typeof(kv.value) = 'number' THEN (kv.value #>> '{}')::numeric
                  WHEN jsonb_typeof(kv.value) = 'string'
                   AND (kv.value #>> '{}') ~ '^-?\\d+(\\.\\d+)?$'
                    THEN (kv.value #>> '{}')::numeric
                  ELSE NULL
                END) AS total
       FROM component_reports cr
       CROSS JOIN LATERAL jsonb_each(cr.data) AS kv
      WHERE cr.district_id = $1
        AND cr.church_id = $2
        AND cr.level = 'church'
        AND cr.year = $3
        AND cr.quarter = $4
        AND cr.status = 'submitted'
      GROUP BY kv.key`,
    [districtId, churchId, year, quarter]
  );
  const totals: Record<string, number> = {};
  for (const row of rows as { key: string | null; total: string | null }[]) {
    if (row.key != null && row.total != null) totals[row.key] = Number(row.total);
  }
  return totals;
}
