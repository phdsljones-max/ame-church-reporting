import { Router } from 'express';
import { pool } from '../db/pool.js';
import { HttpError, asyncHandler, badRequest, notFound } from '../lib/errors.js';
import {
  assertChurchRead,
  assertChurchWrite,
  assertMonth,
  assertYear,
  getDistrictChurch,
  isBlankData,
  toCamel,
} from '../lib/scope.js';

const router = Router({ mergeParams: true });

function monthlyShape(row: unknown) {
  const m = toCamel<Record<string, unknown>>(row);
  return {
    id: String(m.id),
    districtId: String(m.districtId),
    churchId: String(m.churchId),
    year: Number(m.year),
    month: Number(m.month),
    data: (m.data as Record<string, unknown>) ?? {},
    status: String(m.status),
    updatedAt: m.updatedAt ? new Date(String(m.updatedAt)).toISOString() : null,
  };
}

async function scopedChurch(districtId: string, params: Record<string, string>) {
  return getDistrictChurch(districtId, String(params.churchId));
}

/**
 * GET /api/v1/churches/:churchId/monthly-reports?year=
 * -> {items: [{id, churchId, year, month, data, status, updatedAt}]}
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const church = await scopedChurch(user.districtId, req.params as unknown as Record<string, string>);
    assertChurchRead(user, church.id);

    const params: unknown[] = [user.districtId, church.id];
    let sql = 'SELECT * FROM monthly_reports WHERE district_id = $1 AND church_id = $2';
    if (req.query.year !== undefined) {
      const year = assertYear(req.query.year);
      params.push(year);
      sql += ` AND year = $${params.length}`;
    }
    sql += ' ORDER BY year, month';
    const { rows } = await pool.query(sql, params);
    res.json({ items: rows.map(monthlyShape) });
  })
);

/** GET /api/v1/churches/:churchId/monthly-reports/:year/:month */
router.get(
  '/:year/:month',
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const church = await scopedChurch(user.districtId, req.params as unknown as Record<string, string>);
    assertChurchRead(user, church.id);
    const year = assertYear(req.params.year);
    const month = assertMonth(req.params.month);

    const { rows } = await pool.query(
      `SELECT * FROM monthly_reports
        WHERE district_id = $1 AND church_id = $2 AND year = $3 AND month = $4`,
      [user.districtId, church.id, year, month]
    );
    if (!rows.length) throw notFound('No report was entered for that month yet.');
    res.json(monthlyShape(rows[0]));
  })
);

/**
 * PUT /api/v1/churches/:churchId/monthly-reports/:year/:month {data, status}
 * Upsert. Submitting a blank report is rejected (BLANK_SUBMISSION).
 */
router.put(
  '/:year/:month',
  asyncHandler(async (req, res) => {
    const user = req.user!;
    if (!['owner', 'district_admin', 'church_editor'].includes(user.role)) {
      throw new HttpError(403, 'FORBIDDEN', 'You do not have access to this.');
    }
    const church = await scopedChurch(user.districtId, req.params as unknown as Record<string, string>);
    assertChurchWrite(user, church.id);
    const year = assertYear(req.params.year);
    const month = assertMonth(req.params.month);

    const data = req.body?.data;
    if (data !== undefined && (typeof data !== 'object' || data === null || Array.isArray(data))) {
      throw badRequest('INVALID_DATA', 'Report data must be an object of fields.');
    }
    const status = String(req.body?.status ?? 'draft');
    if (!['draft', 'submitted'].includes(status)) {
      throw badRequest('INVALID_STATUS', 'Status must be "draft" or "submitted".');
    }
    const cleanData = data ?? {};
    if (status === 'submitted' && isBlankData(cleanData)) {
      throw new HttpError(
        400,
        'BLANK_SUBMISSION',
        'Add at least one number or note before submitting.'
      );
    }

    const { rows } = await pool.query(
      `INSERT INTO monthly_reports (district_id, church_id, year, month, data, status)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6)
       ON CONFLICT (church_id, year, month)
       DO UPDATE SET data = EXCLUDED.data, status = EXCLUDED.status, updated_at = NOW()
       RETURNING *`,
      [user.districtId, church.id, year, month, JSON.stringify(cleanData), status]
    );
    res.json(monthlyShape(rows[0]));
  })
);

/** DELETE /api/v1/churches/:churchId/monthly-reports/:year/:month */
router.delete(
  '/:year/:month',
  asyncHandler(async (req, res) => {
    const user = req.user!;
    if (!['owner', 'district_admin', 'church_editor'].includes(user.role)) {
      throw new HttpError(403, 'FORBIDDEN', 'You do not have access to this.');
    }
    const church = await scopedChurch(user.districtId, req.params as unknown as Record<string, string>);
    assertChurchWrite(user, church.id);
    const year = assertYear(req.params.year);
    const month = assertMonth(req.params.month);

    const { rowCount } = await pool.query(
      `DELETE FROM monthly_reports
        WHERE district_id = $1 AND church_id = $2 AND year = $3 AND month = $4`,
      [user.districtId, church.id, year, month]
    );
    if (!rowCount) throw notFound('No report was entered for that month yet.');
    res.json({ ok: true });
  })
);

export default router;
