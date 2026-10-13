import { Router } from 'express';
import { pool } from '../db/pool.js';
import { asyncHandler, badRequest, forbidden, notFound } from '../lib/errors.js';
import { assertQuarter, assertUuid, assertYear, pick, toCamel } from '../lib/scope.js';
import { requireRole } from '../middleware/requireRole.js';
import { STANDARD_COMPONENTS } from '../lib/standardComponents.js';
import { districtRollup } from '../lib/rollups.js';

const router = Router();

/** License tiers accepted by the API (validated on create/update). */
export const LICENSE_TIERS = ['pilot', 'basic', 'standard', 'premium'] as const;

function districtShape(row: unknown) {
  const d = toCamel<Record<string, unknown>>(row);
  return {
    id: String(d.id),
    name: String(d.name),
    licenseTier: String(d.licenseTier ?? 'standard'),
    licenseExpiresAt: d.licenseExpiresAt ? new Date(String(d.licenseExpiresAt)).toISOString() : null,
    isActive: d.isActive !== false,
    createdAt: d.createdAt ? new Date(String(d.createdAt)).toISOString() : null,
  };
}

/** GET /api/v1/districts — owner sees all; everyone else sees their own district. */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const { rows } =
      user.role === 'owner'
        ? await pool.query('SELECT * FROM districts ORDER BY name')
        : await pool.query('SELECT * FROM districts WHERE id = $1', [user.districtId]);
    res.json({ items: rows.map(districtShape) });
  })
);

/** GET /api/v1/districts/:id */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const id = assertUuid(req.params.id, 'district ID');
    if (user.role !== 'owner' && id !== user.districtId) {
      throw notFound('We could not find that district.');
    }
    const { rows } = await pool.query('SELECT * FROM districts WHERE id = $1', [id]);
    if (!rows.length) throw notFound('We could not find that district.');
    res.json(districtShape(rows[0]));
  })
);

/**
 * POST /api/v1/districts {name, licenseTier?, licenseExpiresAt?} — owner only.
 * Seeds the 13 standard components for the new district.
 */
router.post(
  '/',
  requireRole('owner'),
  asyncHandler(async (req, res) => {
    const name = String(req.body?.name ?? '').trim();
    if (!name) throw badRequest('MISSING_NAME', 'Give the district a name.');

    const tier = String(pick(req.body, 'licenseTier') ?? 'standard');
    if (!(LICENSE_TIERS as readonly string[]).includes(tier)) {
      throw badRequest(
        'INVALID_TIER',
        `License tier must be one of: ${LICENSE_TIERS.join(', ')}.`
      );
    }
    const expiresRaw = pick(req.body, 'licenseExpiresAt');
    let expiresAt: string | null = null;
    if (expiresRaw !== undefined && expiresRaw !== null && expiresRaw !== '') {
      const d = new Date(String(expiresRaw));
      if (Number.isNaN(d.getTime())) {
        throw badRequest('INVALID_DATE', 'Enter a valid license expiry date.');
      }
      expiresAt = d.toISOString();
    }

    const { rows } = await pool.query(
      'INSERT INTO districts (name, license_tier, license_expires_at) VALUES ($1, $2, $3) RETURNING *',
      [name, tier, expiresAt]
    );
    const district = rows[0];
    for (let i = 0; i < STANDARD_COMPONENTS.length; i++) {
      await pool.query(
        `INSERT INTO components (district_id, name, sort_order)
         VALUES ($1, $2, $3) ON CONFLICT (district_id, name) DO NOTHING`,
        [district.id, STANDARD_COMPONENTS[i], i]
      );
    }
    res.status(201).json(districtShape(district));
  })
);

/** PATCH /api/v1/districts/:id — owner only (license panel). */
router.patch(
  '/:id',
  requireRole('owner'),
  asyncHandler(async (req, res) => {
    const id = assertUuid(req.params.id, 'district ID');
    const updates: string[] = [];
    const params: unknown[] = [];
    const add = (column: string, value: unknown): void => {
      params.push(value);
      updates.push(`${column} = $${params.length}`);
    };

    if (req.body?.name !== undefined || pick(req.body, 'name') !== undefined) {
      const name = String(pick(req.body, 'name') ?? '').trim();
      if (!name) throw badRequest('MISSING_NAME', 'Give the district a name.');
      add('name', name);
    }
    const tier = pick(req.body, 'licenseTier');
    if (tier !== undefined) {
      const t = String(tier);
      if (!(LICENSE_TIERS as readonly string[]).includes(t)) {
        throw badRequest('INVALID_TIER', `License tier must be one of: ${LICENSE_TIERS.join(', ')}.`);
      }
      add('license_tier', t);
    }
    const expiresRaw = pick(req.body, 'licenseExpiresAt');
    if (expiresRaw !== undefined) {
      if (expiresRaw === null || expiresRaw === '') {
        add('license_expires_at', null);
      } else {
        const d = new Date(String(expiresRaw));
        if (Number.isNaN(d.getTime())) {
          throw badRequest('INVALID_DATE', 'Enter a valid license expiry date.');
        }
        add('license_expires_at', d.toISOString());
      }
    }
    const active = pick(req.body, 'isActive');
    if (active !== undefined) add('is_active', Boolean(active));

    if (!updates.length) throw badRequest('NO_CHANGES', 'Nothing to update.');
    params.push(id);
    const { rows } = await pool.query(
      `UPDATE districts SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );
    if (!rows.length) throw notFound('We could not find that district.');
    res.json(districtShape(rows[0]));
  })
);

/**
 * GET /api/v1/districts/:id/overview — owner license panel counts
 * (also available to the district's own district_admin).
 */
router.get(
  '/:id/overview',
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const id = assertUuid(req.params.id, 'district ID');
    if (user.role !== 'owner' && user.role !== 'district_admin') throw forbidden();
    if (user.role !== 'owner' && id !== user.districtId) {
      throw notFound('We could not find that district.');
    }
    const { rows: drows } = await pool.query('SELECT id FROM districts WHERE id = $1', [id]);
    if (!drows.length) throw notFound('We could not find that district.');

    const [users, churches, components, monthly] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS n FROM users WHERE district_id = $1', [id]),
      pool.query('SELECT COUNT(*)::int AS n FROM churches WHERE district_id = $1', [id]),
      pool.query('SELECT COUNT(*)::int AS n FROM components WHERE district_id = $1', [id]),
      pool.query('SELECT COUNT(*)::int AS n FROM monthly_reports WHERE district_id = $1', [id]),
    ]);
    const userCount = users.rows[0].n as number;
    const churchCount = churches.rows[0].n as number;
    res.json({
      districtId: id,
      userCount,
      users: userCount,
      churchCount,
      churches: churchCount,
      componentCount: components.rows[0].n as number,
      monthlyReportCount: monthly.rows[0].n as number,
    });
  })
);

/**
 * GET /api/v1/districts/:id/rollup?year=&quarter= — bottom-up rollup for
 * elder/bishop views: churches -> PE districts -> conference -> connectional.
 */
router.get(
  '/:id/rollup',
  asyncHandler(async (req, res) => {
    const user = req.user!;
    if (!['owner', 'district_admin', 'presiding_elder', 'bishop'].includes(user.role)) {
      throw forbidden();
    }
    const id = assertUuid(req.params.id, 'district ID');
    if (user.role !== 'owner' && id !== user.districtId) {
      throw notFound('We could not find that district.');
    }
    const { rows: drows } = await pool.query('SELECT id FROM districts WHERE id = $1', [id]);
    if (!drows.length) throw notFound('We could not find that district.');

    const year = assertYear(req.query.year);
    const quarter = assertQuarter(req.query.quarter);
    const rollup = await districtRollup(pool, id, year, quarter);
    res.json(rollup);
  })
);

export default router;
