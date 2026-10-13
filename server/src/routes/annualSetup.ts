import { Router } from 'express';
import crypto from 'node:crypto';
import { pool } from '../db/pool.js';
import { asyncHandler, badRequest, forbidden } from '../lib/errors.js';
import {
  assertUuid,
  assertYear,
  getDistrictChurch,
  getDistrictComponent,
  pick,
  toCamel,
} from '../lib/scope.js';
import type { AuthUser } from '../middleware/auth.js';

const GOAL_STATUSES = ['not_started', 'in_progress', 'complete'] as const;
const LEVELS = ['church', 'district', 'conference', 'connectional'] as const;

export interface AnnualGoal {
  id: string;
  text: string;
  target: string;
  progress: number;
  status: (typeof GOAL_STATUSES)[number];
}

/** Validate/normalize the goals list. Never pre-fills anything. */
export function cleanGoals(input: unknown): AnnualGoal[] {
  if (input === undefined || input === null) return [];
  if (!Array.isArray(input)) {
    throw badRequest('INVALID_GOALS', 'Goals must be a list.');
  }
  return input.map((raw, index) => {
    const n = index + 1;
    if (!raw || typeof raw !== 'object') {
      throw badRequest('INVALID_GOALS', `Goal ${n} is not valid.`);
    }
    const g = raw as Record<string, unknown>;
    const text = String(g.text ?? '').trim();
    if (!text) throw badRequest('INVALID_GOALS', `Goal ${n} needs a description.`);
    const status = String(g.status ?? 'not_started');
    if (!(GOAL_STATUSES as readonly string[]).includes(status)) {
      throw badRequest(
        'INVALID_GOALS',
        `Goal ${n} has an invalid status. Use not_started, in_progress, or complete.`
      );
    }
    const progress = Number(g.progress ?? 0);
    if (!Number.isFinite(progress) || progress < 0 || progress > 100) {
      throw badRequest('INVALID_GOALS', `Goal ${n} progress must be a number from 0 to 100.`);
    }
    return {
      id: String(g.id ?? crypto.randomUUID()),
      text,
      target: String(g.target ?? ''),
      progress,
      status: status as AnnualGoal['status'],
    };
  });
}

function churchSetupShape(row: unknown) {
  const s = toCamel<Record<string, unknown>>(row);
  return {
    id: String(s.id),
    districtId: String(s.districtId),
    churchId: String(s.churchId),
    year: Number(s.year),
    theme: String(s.theme ?? ''),
    scripture: String(s.scripture ?? ''),
    goals: (Array.isArray(s.goals) ? s.goals : []) as AnnualGoal[],
    updatedAt: s.updatedAt ? new Date(String(s.updatedAt)).toISOString() : null,
  };
}

function componentSetupShape(row: unknown) {
  const s = toCamel<Record<string, unknown>>(row);
  return {
    id: String(s.id),
    districtId: String(s.districtId),
    componentId: String(s.componentId),
    churchId: (s.churchId as string | null) ?? null,
    level: String(s.level),
    year: Number(s.year),
    theme: String(s.theme ?? ''),
    scripture: String(s.scripture ?? ''),
    goals: (Array.isArray(s.goals) ? s.goals : []) as AnnualGoal[],
    updatedAt: s.updatedAt ? new Date(String(s.updatedAt)).toISOString() : null,
  };
}

function blankChurchSetup(churchId: string, year: number) {
  return { churchId, year, theme: '', scripture: '', goals: [] as AnnualGoal[] };
}

function blankComponentSetup(
  componentId: string,
  churchId: string | null,
  level: string,
  year: number
) {
  return { componentId, churchId, level, year, theme: '', scripture: '', goals: [] as AnnualGoal[] };
}

/** church_editor: own church only. district_admin/owner: any church in the district. */
function assertChurchSetupAccess(user: AuthUser, churchId: string): void {
  if (user.role === 'owner' || user.role === 'district_admin') return;
  if (user.role === 'church_editor' && user.churchId === churchId) return;
  throw forbidden();
}

/**
 * component_leader: own component only.
 * church_editor: church-level setups for their own church only.
 * district_admin/owner: anything in the district.
 */
function assertComponentSetupAccess(
  user: AuthUser,
  componentId: string,
  churchId: string | null,
  level: string
): void {
  if (user.role === 'owner' || user.role === 'district_admin') return;
  if (user.role === 'component_leader' && user.componentId === componentId) return;
  if (
    user.role === 'church_editor' &&
    level === 'church' &&
    user.churchId &&
    user.churchId === churchId
  ) {
    return;
  }
  throw forbidden();
}

// ---------------------------------------------------------------------------
// Church annual setup — mounted at /api/v1/churches/:churchId/annual-setup
// ---------------------------------------------------------------------------
export const churchAnnualSetupRouter = Router({ mergeParams: true });

/** GET /api/v1/churches/:churchId/annual-setup/:year — blank defaults when nothing saved. */
churchAnnualSetupRouter.get(
  '/:year',
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const churchId = String(req.params.churchId);
    await getDistrictChurch(user.districtId, churchId);
    assertChurchSetupAccess(user, churchId);
    const year = assertYear(req.params.year);

    const { rows } = await pool.query(
      'SELECT * FROM church_annual_setup WHERE district_id = $1 AND church_id = $2 AND year = $3',
      [user.districtId, churchId, year]
    );
    if (!rows.length) {
      res.json(blankChurchSetup(churchId, year));
      return;
    }
    res.json(churchSetupShape(rows[0]));
  })
);

/** PUT /api/v1/churches/:churchId/annual-setup/:year {theme, scripture, goals} — upsert. */
churchAnnualSetupRouter.put(
  '/:year',
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const churchId = String(req.params.churchId);
    await getDistrictChurch(user.districtId, churchId);
    assertChurchSetupAccess(user, churchId);
    const year = assertYear(req.params.year);

    const theme = String(pick(req.body, 'theme') ?? '');
    const scripture = String(pick(req.body, 'scripture') ?? '');
    const goals = cleanGoals(pick(req.body, 'goals'));

    const { rows } = await pool.query(
      `INSERT INTO church_annual_setup (district_id, church_id, year, theme, scripture, goals)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)
       ON CONFLICT (church_id, year)
       DO UPDATE SET theme = EXCLUDED.theme,
                     scripture = EXCLUDED.scripture,
                     goals = EXCLUDED.goals,
                     updated_at = NOW()
       RETURNING *`,
      [user.districtId, churchId, year, theme, scripture, JSON.stringify(goals)]
    );
    res.json(churchSetupShape(rows[0]));
  })
);

// ---------------------------------------------------------------------------
// Component annual setup — mounted at /api/v1/component-annual-setup
// Identity comes from query params (body accepted as fallback):
//   ?componentId=&churchId=&level=&year=
// ---------------------------------------------------------------------------
export const componentAnnualSetupRouter = Router();

function setupIdentity(req: {
  query: Record<string, unknown>;
  body: unknown;
}): { componentId: string; churchId: string | null; level: string; year: number } {
  const q = req.query ?? {};
  const componentIdRaw = q.componentId ?? pick(req.body, 'componentId');
  const levelRaw = q.level ?? pick(req.body, 'level');
  const yearRaw = q.year ?? pick(req.body, 'year');
  let churchIdRaw = q.churchId ?? pick(req.body, 'churchId');

  if (!componentIdRaw) throw badRequest('MISSING_COMPONENT', 'Choose a component.');
  const componentId = assertUuid(String(componentIdRaw), 'component ID');

  const level = String(levelRaw ?? 'church');
  if (!(LEVELS as readonly string[]).includes(level)) {
    throw badRequest('INVALID_LEVEL', 'Level must be church, district, conference, or connectional.');
  }
  const year = assertYear(yearRaw);

  let churchId: string | null = null;
  if (level === 'church') {
    if (churchIdRaw === undefined || churchIdRaw === null || churchIdRaw === '') {
      churchIdRaw = null;
    } else {
      churchId = assertUuid(String(churchIdRaw), 'church ID');
    }
  }
  return { componentId, churchId, level, year };
}

/** GET /api/v1/component-annual-setup?componentId=&churchId=&level=&year= — blank defaults. */
componentAnnualSetupRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const { componentId, churchId: rawChurchId, level, year } = setupIdentity(req);
    await getDistrictComponent(user.districtId, componentId);

    // For church-level setups, default to the requester's church when omitted.
    let churchId = rawChurchId;
    if (level === 'church' && !churchId && user.churchId) churchId = user.churchId;
    assertComponentSetupAccess(user, componentId, churchId, level);
    if (churchId) await getDistrictChurch(user.districtId, churchId);

    const { rows } = await pool.query(
      `SELECT * FROM component_annual_setup
        WHERE district_id = $1 AND component_id = $2
          AND church_id IS NOT DISTINCT FROM $3 AND level = $4 AND year = $5`,
      [user.districtId, componentId, churchId, level, year]
    );
    if (!rows.length) {
      res.json(blankComponentSetup(componentId, churchId, level, year));
      return;
    }
    res.json(componentSetupShape(rows[0]));
  })
);

/**
 * PUT /api/v1/component-annual-setup?componentId=&churchId=&level=&year=
 * Body: {theme, scripture, goals} — upsert.
 */
componentAnnualSetupRouter.put(
  '/',
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const { componentId, churchId: rawChurchId, level, year } = setupIdentity(req);
    await getDistrictComponent(user.districtId, componentId);

    let churchId = rawChurchId;
    if (level === 'church' && !churchId) {
      if (user.churchId) {
        churchId = user.churchId;
      } else {
        throw badRequest(
          'MISSING_CHURCH',
          'Choose a church for this church-level setup.'
        );
      }
    }
    assertComponentSetupAccess(user, componentId, churchId, level);
    if (churchId) await getDistrictChurch(user.districtId, churchId);

    const theme = String(pick(req.body, 'theme') ?? '');
    const scripture = String(pick(req.body, 'scripture') ?? '');
    const goals = cleanGoals(pick(req.body, 'goals'));

    const { rows: updated } = await pool.query(
      `UPDATE component_annual_setup
          SET theme = $1, scripture = $2, goals = $3::jsonb, updated_at = NOW()
        WHERE district_id = $4 AND component_id = $5
          AND church_id IS NOT DISTINCT FROM $6 AND level = $7 AND year = $8
        RETURNING *`,
      [theme, scripture, JSON.stringify(goals), user.districtId, componentId, churchId, level, year]
    );
    let row = updated[0];
    if (!row) {
      const { rows } = await pool.query(
        `INSERT INTO component_annual_setup
           (district_id, component_id, church_id, level, year, theme, scripture, goals)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
         RETURNING *`,
        [user.districtId, componentId, churchId, level, year, theme, scripture, JSON.stringify(goals)]
      );
      row = rows[0];
    }
    res.json(componentSetupShape(row));
  })
);
