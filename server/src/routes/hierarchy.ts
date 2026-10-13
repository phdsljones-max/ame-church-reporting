import { Router } from 'express';
import { pool } from '../db/pool.js';
import { asyncHandler, badRequest, notFound } from '../lib/errors.js';
import { assertUuid, toCamel } from '../lib/scope.js';
import { requireRole } from '../middleware/requireRole.js';

/**
 * District hierarchy: PE districts, annual conferences, and the
 * connectional profile. All district-scoped. Writes are owner/district_admin.
 */

function namedShape(row: unknown) {
  const r = toCamel<Record<string, unknown>>(row);
  return {
    id: String(r.id),
    districtId: String(r.districtId),
    name: String(r.name),
    createdAt: r.createdAt ? new Date(String(r.createdAt)).toISOString() : null,
  };
}

function makeNamedRouter(table: 'pe_districts' | 'annual_conferences'): Router {
  const router = Router();

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const { rows } = await pool.query(
        `SELECT * FROM ${table} WHERE district_id = $1 ORDER BY name`,
        [req.user!.districtId]
      );
      res.json({ items: rows.map(namedShape) });
    })
  );

  router.post(
    '/',
    requireRole('owner', 'district_admin'),
    asyncHandler(async (req, res) => {
      const name = String(req.body?.name ?? '').trim();
      if (!name) throw badRequest('MISSING_NAME', 'Give it a name.');
      const { rows } = await pool.query(
        `INSERT INTO ${table} (district_id, name) VALUES ($1, $2) RETURNING *`,
        [req.user!.districtId, name]
      );
      res.status(201).json(namedShape(rows[0]));
    })
  );

  const getOne = asyncHandler(async (req, res) => {
    const id = assertUuid(req.params.id, 'ID');
    const { rows } = await pool.query(
      `SELECT * FROM ${table} WHERE id = $1 AND district_id = $2`,
      [id, req.user!.districtId]
    );
    if (!rows.length) throw notFound('We could not find that.');
    res.json(namedShape(rows[0]));
  });
  router.get('/:id', getOne);

  router.patch(
    '/:id',
    requireRole('owner', 'district_admin'),
    asyncHandler(async (req, res) => {
      const id = assertUuid(req.params.id, 'ID');
      const name = String(req.body?.name ?? '').trim();
      if (!name) throw badRequest('MISSING_NAME', 'Give it a name.');
      const { rows } = await pool.query(
        `UPDATE ${table} SET name = $1 WHERE id = $2 AND district_id = $3 RETURNING *`,
        [name, id, req.user!.districtId]
      );
      if (!rows.length) throw notFound('We could not find that.');
      res.json(namedShape(rows[0]));
    })
  );

  router.delete(
    '/:id',
    requireRole('owner', 'district_admin'),
    asyncHandler(async (req, res) => {
      const id = assertUuid(req.params.id, 'ID');
      const { rowCount } = await pool.query(
        `DELETE FROM ${table} WHERE id = $1 AND district_id = $2`,
        [id, req.user!.districtId]
      );
      if (!rowCount) throw notFound('We could not find that.');
      res.json({ ok: true });
    })
  );

  return router;
}

export const peDistrictsRouter = makeNamedRouter('pe_districts');
export const annualConferencesRouter = makeNamedRouter('annual_conferences');

// --- Connectional profile: one per district --------------------------------
export const connectionalProfileRouter = Router();

/** GET /api/v1/connectional-profile -> {districtId, profile} (empty object when unset). */
connectionalProfileRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      'SELECT * FROM connectional_profile WHERE district_id = $1',
      [req.user!.districtId]
    );
    if (!rows.length) {
      res.json({ districtId: req.user!.districtId, profile: {} });
      return;
    }
    const r = toCamel<Record<string, unknown>>(rows[0]);
    res.json({ districtId: String(r.districtId), profile: r.profile ?? {} });
  })
);

/** PUT /api/v1/connectional-profile {profile} — upsert, owner/district_admin. */
connectionalProfileRouter.put(
  '/',
  requireRole('owner', 'district_admin'),
  asyncHandler(async (req, res) => {
    const profile = req.body?.profile ?? {};
    if (typeof profile !== 'object' || profile === null || Array.isArray(profile)) {
      throw badRequest('INVALID_PROFILE', 'Profile must be an object.');
    }
    const { rows } = await pool.query(
      `INSERT INTO connectional_profile (district_id, profile)
       VALUES ($1, $2::jsonb)
       ON CONFLICT (district_id) DO UPDATE SET profile = EXCLUDED.profile
       RETURNING *`,
      [req.user!.districtId, JSON.stringify(profile)]
    );
    const r = toCamel<Record<string, unknown>>(rows[0]);
    res.json({ districtId: String(r.districtId), profile: r.profile ?? {} });
  })
);
