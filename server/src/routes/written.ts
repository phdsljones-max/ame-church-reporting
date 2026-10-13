import { Router } from 'express';
import { pool } from '../db/pool.js';
import { HttpError, asyncHandler, badRequest, notFound } from '../lib/errors.js';
import {
  assertQuarter,
  assertUuid,
  assertWrittenWrite,
  assertYear,
  getDistrictChurch,
  isBlankData,
  pick,
  toCamel,
} from '../lib/scope.js';

const router = Router();
const LEVELS = ['church', 'district', 'conference', 'connectional'] as const;

function writtenShape(row: unknown) {
  const w = toCamel<Record<string, unknown>>(row);
  return {
    id: String(w.id),
    districtId: String(w.districtId),
    scopeKey: String(w.scopeKey),
    churchId: (w.churchId as string | null) ?? null,
    level: String(w.level),
    year: Number(w.year),
    quarter: Number(w.quarter),
    contributorName: (w.contributorName as string | null) ?? null,
    activities: (w.activities as string | null) ?? null,
    eventsHeld: (w.eventsHeld as string | null) ?? null,
    peopleToRecognize: (w.peopleToRecognize as string | null) ?? null,
    needs: (w.needs as string | null) ?? null,
    additionalNotes: (w.additionalNotes as string | null) ?? null,
    submittedBy: (w.submittedBy as string | null) ?? null,
    status: String(w.status),
    createdAt: w.createdAt ? new Date(String(w.createdAt)).toISOString() : null,
    updatedAt: w.updatedAt ? new Date(String(w.updatedAt)).toISOString() : null,
  };
}

/**
 * Scope keys group written contributions for composite assembly:
 *   church:<churchId>  — a single church's quarterly report
 *   component:<componentId> — a component's quarterly report
 *   district | conference | connectional — wider levels
 */
function normalizeScope(body: unknown, userChurchId: string | null): { scopeKey: string; churchId: string | null } {
  const scopeKey = String(pick(body, 'scopeKey') ?? '').trim();
  if (!scopeKey) throw badRequest('MISSING_SCOPE', 'Choose what this report is for.');
  const churchIdRaw = pick(body, 'churchId');
  let churchId: string | null = null;
  if (scopeKey.startsWith('church:')) {
    const id = scopeKey.slice('church:'.length);
    assertUuid(id, 'church ID');
    churchId = id;
  } else if (churchIdRaw) {
    churchId = assertUuid(String(churchIdRaw), 'church ID');
  } else if (userChurchId) {
    churchId = userChurchId;
  }
  return { scopeKey, churchId };
}

/**
 * GET /api/v1/written-reports?scopeKey=&churchId=&level=&year=&quarter=&status=
 * -> {items: [...]}. church_editor sees their church's rows; component_leader
 * sees their component's rows.
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const params: unknown[] = [user.districtId];
    const clauses = ['district_id = $1'];

    if (req.query.scopeKey) {
      params.push(String(req.query.scopeKey));
      clauses.push(`scope_key = $${params.length}`);
    }
    if (req.query.churchId) {
      params.push(assertUuid(String(req.query.churchId), 'church ID'));
      clauses.push(`church_id = $${params.length}`);
    }
    if (req.query.level) {
      const level = String(req.query.level);
      if (!(LEVELS as readonly string[]).includes(level)) {
        throw badRequest('INVALID_LEVEL', 'Level must be church, district, conference, or connectional.');
      }
      params.push(level);
      clauses.push(`level = $${params.length}`);
    }
    if (req.query.year !== undefined) {
      params.push(assertYear(req.query.year));
      clauses.push(`year = $${params.length}`);
    }
    if (req.query.quarter !== undefined) {
      params.push(assertQuarter(req.query.quarter));
      clauses.push(`quarter = $${params.length}`);
    }
    if (req.query.status) {
      const status = String(req.query.status);
      if (!['draft', 'submitted'].includes(status)) {
        throw badRequest('INVALID_STATUS', 'Status must be "draft" or "submitted".');
      }
      params.push(status);
      clauses.push(`status = $${params.length}`);
    }

    // Role-based narrowing so leaders only see their own scope.
    if (user.role === 'church_editor' && user.churchId) {
      params.push(`church:${user.churchId}`, user.churchId);
      clauses.push(`(scope_key = $${params.length - 1} OR church_id = $${params.length})`);
    } else if (user.role === 'component_leader' && user.componentId) {
      params.push(`component:${user.componentId}`);
      clauses.push(`scope_key = $${params.length}`);
    } else if (user.role === 'church_editor' || user.role === 'component_leader') {
      throw new HttpError(403, 'FORBIDDEN', 'You do not have access to this.');
    }

    const { rows } = await pool.query(
      `SELECT * FROM written_reports WHERE ${clauses.join(' AND ')} ORDER BY created_at`,
      params
    );
    res.json({ items: rows.map(writtenShape) });
  })
);

/** GET /api/v1/written-reports/:id */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const id = assertUuid(req.params.id, 'report ID');
    const { rows } = await pool.query(
      'SELECT * FROM written_reports WHERE id = $1 AND district_id = $2',
      [id, user.districtId]
    );
    if (!rows.length) throw notFound('We could not find that report.');
    const row = rows[0];
    // Read follows the same scope rule as write.
    try {
      assertWrittenWrite(user, row.scope_key);
    } catch {
      if (!['presiding_elder', 'bishop'].includes(user.role)) throw new HttpError(403, 'FORBIDDEN', 'You do not have access to this.');
    }
    res.json(writtenShape(row));
  })
);

/**
 * POST /api/v1/written-reports
 * {scopeKey, churchId?, level, year, quarter, contributorName?, activities?,
 *  eventsHeld?, peopleToRecognize?, needs?, additionalNotes?, submittedBy?, status?}
 */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const { scopeKey, churchId } = normalizeScope(req.body, user.churchId);
    assertWrittenWrite(user, scopeKey);
    if (churchId) await getDistrictChurch(user.districtId, churchId);

    const level = String(pick(req.body, 'level') ?? 'church');
    if (!(LEVELS as readonly string[]).includes(level)) {
      throw badRequest('INVALID_LEVEL', 'Level must be church, district, conference, or connectional.');
    }
    const year = assertYear(pick(req.body, 'year'));
    const quarter = assertQuarter(pick(req.body, 'quarter'));
    const status = String(pick(req.body, 'status') ?? 'draft');
    if (!['draft', 'submitted'].includes(status)) {
      throw badRequest('INVALID_STATUS', 'Status must be "draft" or "submitted".');
    }

    const fields = {
      contributorName: pick(req.body, 'contributorName'),
      activities: pick(req.body, 'activities'),
      eventsHeld: pick(req.body, 'eventsHeld'),
      peopleToRecognize: pick(req.body, 'peopleToRecognize'),
      needs: pick(req.body, 'needs'),
      additionalNotes: pick(req.body, 'additionalNotes'),
      submittedBy: pick(req.body, 'submittedBy') ?? user.email,
    };
    if (
      status === 'submitted' &&
      isBlankData({
        contributorName: fields.contributorName,
        activities: fields.activities,
        eventsHeld: fields.eventsHeld,
        peopleToRecognize: fields.peopleToRecognize,
        needs: fields.needs,
        additionalNotes: fields.additionalNotes,
      })
    ) {
      throw new HttpError(400, 'BLANK_SUBMISSION', 'Add at least one number or note before submitting.');
    }

    const { rows } = await pool.query(
      `INSERT INTO written_reports
         (district_id, scope_key, church_id, level, year, quarter,
          contributor_name, activities, events_held, people_to_recognize,
          needs, additional_notes, submitted_by, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [
        user.districtId,
        scopeKey,
        churchId,
        level,
        year,
        quarter,
        strOrNull(fields.contributorName),
        strOrNull(fields.activities),
        strOrNull(fields.eventsHeld),
        strOrNull(fields.peopleToRecognize),
        strOrNull(fields.needs),
        strOrNull(fields.additionalNotes),
        strOrNull(fields.submittedBy),
        status,
      ]
    );
    res.status(201).json(writtenShape(rows[0]));
  })
);

function strOrNull(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const s = String(value);
  return s === '' ? null : s;
}

/** PATCH /api/v1/written-reports/:id */
router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const id = assertUuid(req.params.id, 'report ID');
    const { rows: existing } = await pool.query(
      'SELECT * FROM written_reports WHERE id = $1 AND district_id = $2',
      [id, user.districtId]
    );
    if (!existing.length) throw notFound('We could not find that report.');
    assertWrittenWrite(user, existing[0].scope_key);

    const status = pick(req.body, 'status');
    if (status !== undefined && !['draft', 'submitted'].includes(String(status))) {
      throw badRequest('INVALID_STATUS', 'Status must be "draft" or "submitted".');
    }

    const updates: string[] = [];
    const params: unknown[] = [];
    const add = (column: string, value: unknown): void => {
      params.push(value);
      updates.push(`${column} = $${params.length}`);
    };
    const textField = (key: string, column: string): void => {
      const v = pick(req.body, key);
      if (v !== undefined) add(column, strOrNull(v));
    };
    textField('contributorName', 'contributor_name');
    textField('activities', 'activities');
    textField('eventsHeld', 'events_held');
    textField('peopleToRecognize', 'people_to_recognize');
    textField('needs', 'needs');
    textField('additionalNotes', 'additional_notes');
    textField('submittedBy', 'submitted_by');
    if (status !== undefined) add('status', String(status));
    if (!updates.length) throw badRequest('NO_CHANGES', 'Nothing to update.');
    updates.push('updated_at = NOW()');

    params.push(id, user.districtId);
    const { rows } = await pool.query(
      `UPDATE written_reports SET ${updates.join(', ')}
        WHERE id = $${params.length - 1} AND district_id = $${params.length}
        RETURNING *`,
      params
    );
    res.json(writtenShape(rows[0]));
  })
);

/** DELETE /api/v1/written-reports/:id */
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const id = assertUuid(req.params.id, 'report ID');
    const { rows: existing } = await pool.query(
      'SELECT * FROM written_reports WHERE id = $1 AND district_id = $2',
      [id, user.districtId]
    );
    if (!existing.length) throw notFound('We could not find that report.');
    assertWrittenWrite(user, existing[0].scope_key);
    await pool.query('DELETE FROM written_reports WHERE id = $1', [id]);
    res.json({ ok: true });
  })
);

export default router;
