import { Router } from 'express';
import { pool } from '../db/pool.js';
import { HttpError, asyncHandler, badRequest, notFound } from '../lib/errors.js';
import {
  assertComponentRead,
  assertComponentWrite,
  assertQuarter,
  assertUuid,
  assertYear,
  getDistrictChurch,
  getDistrictComponent,
  isBlankData,
  pick,
  toCamel,
} from '../lib/scope.js';

const router = Router();
const LEVELS = ['church', 'district', 'conference', 'connectional'] as const;

function reportShape(row: unknown) {
  const r = toCamel<Record<string, unknown>>(row);
  return {
    id: String(r.id),
    districtId: String(r.districtId),
    componentId: String(r.componentId),
    churchId: (r.churchId as string | null) ?? null,
    level: String(r.level),
    year: Number(r.year),
    quarter: Number(r.quarter),
    data: (r.data as Record<string, unknown>) ?? {},
    status: String(r.status),
    updatedAt: r.updatedAt ? new Date(String(r.updatedAt)).toISOString() : null,
  };
}

/**
 * GET /api/v1/component-reports?componentId=&churchId=&level=&year=&quarter=&status=
 * -> {items: [...]}. component_leader is forced to their own component.
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const params: unknown[] = [user.districtId];
    const clauses = ['district_id = $1'];

    let componentId = req.query.componentId ? String(req.query.componentId) : null;
    if (user.role === 'component_leader') {
      if (!user.componentId) throw new HttpError(403, 'FORBIDDEN', 'You do not have access to this.');
      componentId = user.componentId;
    }
    if (componentId) {
      assertUuid(componentId, 'component ID');
      params.push(componentId);
      clauses.push(`component_id = $${params.length}`);
    }
    if (req.query.churchId) {
      const churchId = assertUuid(String(req.query.churchId), 'church ID');
      params.push(churchId);
      clauses.push(`church_id = $${params.length}`);
    } else if ((user.role === 'church_editor' || user.role === 'component_leader') && user.churchId) {
      params.push(user.churchId);
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

    const { rows } = await pool.query(
      `SELECT * FROM component_reports WHERE ${clauses.join(' AND ')} ORDER BY year, quarter`,
      params
    );
    const items = rows.map(reportShape);
    if (user.role === 'component_leader' || user.role === 'church_editor') {
      // Extra guard: never leak another component's rows through filter tricks.
      const filtered = items.filter((r) =>
        user.role === 'component_leader' ? r.componentId === user.componentId : true
      );
      res.json({ items: filtered });
      return;
    }
    res.json({ items });
  })
);

/** GET /api/v1/component-reports/:id */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const id = assertUuid(req.params.id, 'report ID');
    const { rows } = await pool.query(
      'SELECT * FROM component_reports WHERE id = $1 AND district_id = $2',
      [id, user.districtId]
    );
    if (!rows.length) throw notFound('We could not find that report.');
    assertComponentRead(user, rows[0].component_id);
    res.json(reportShape(rows[0]));
  })
);

/**
 * PUT /api/v1/component-reports
 * {componentId, churchId?, level, year, quarter, data?, status?}
 * Upserts the component's quarterly report. component_leader may only write
 * their own component; submitting a blank report is rejected.
 * -> 200 with the saved report.
 */
router.put(
  '/',
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const componentIdRaw = pick(req.body, 'componentId');
    if (!componentIdRaw) throw badRequest('MISSING_COMPONENT', 'Choose a component.');
    const componentId = assertUuid(String(componentIdRaw), 'component ID');
    await getDistrictComponent(user.districtId, componentId);
    assertComponentWrite(user, componentId);

    const level = String(pick(req.body, 'level') ?? 'church');
    if (!(LEVELS as readonly string[]).includes(level)) {
      throw badRequest('INVALID_LEVEL', 'Level must be church, district, conference, or connectional.');
    }
    const year = assertYear(pick(req.body, 'year'));
    const quarter = assertQuarter(pick(req.body, 'quarter'));

    let churchId: string | null = null;
    const churchIdRaw = pick(req.body, 'churchId');
    if (level === 'church') {
      if (churchIdRaw) {
        churchId = assertUuid(String(churchIdRaw), 'church ID');
      } else if (user.churchId) {
        churchId = user.churchId;
      } else {
        throw badRequest('MISSING_CHURCH', 'Choose a church for this church-level report.');
      }
      await getDistrictChurch(user.districtId, churchId);
    }

    const data = pick(req.body, 'data');
    if (data !== undefined && (typeof data !== 'object' || data === null || Array.isArray(data))) {
      throw badRequest('INVALID_DATA', 'Report data must be an object of fields.');
    }
    const status = String(pick(req.body, 'status') ?? 'draft');
    if (!['draft', 'submitted'].includes(status)) {
      throw badRequest('INVALID_STATUS', 'Status must be "draft" or "submitted".');
    }
    const cleanData = (data as Record<string, unknown>) ?? {};
    if (status === 'submitted' && isBlankData(cleanData)) {
      throw new HttpError(400, 'BLANK_SUBMISSION', 'Add at least one number or note before submitting.');
    }

    const { rows: updated } = await pool.query(
      `UPDATE component_reports
          SET data = $1::jsonb, status = $2, updated_at = NOW()
        WHERE district_id = $3 AND component_id = $4
          AND church_id IS NOT DISTINCT FROM $5 AND level = $6 AND year = $7 AND quarter = $8
        RETURNING *`,
      [JSON.stringify(cleanData), status, user.districtId, componentId, churchId, level, year, quarter]
    );
    let row = updated[0];
    if (!row) {
      const { rows } = await pool.query(
        `INSERT INTO component_reports
           (district_id, component_id, church_id, level, year, quarter, data, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
         RETURNING *`,
        [user.districtId, componentId, churchId, level, year, quarter, JSON.stringify(cleanData), status]
      );
      row = rows[0];
    }
    res.json(reportShape(row));
  })
);

/** DELETE /api/v1/component-reports/:id */
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const id = assertUuid(req.params.id, 'report ID');
    const { rows } = await pool.query(
      'SELECT * FROM component_reports WHERE id = $1 AND district_id = $2',
      [id, user.districtId]
    );
    if (!rows.length) throw notFound('We could not find that report.');
    assertComponentWrite(user, rows[0].component_id);
    await pool.query('DELETE FROM component_reports WHERE id = $1', [id]);
    res.json({ ok: true });
  })
);

export default router;
