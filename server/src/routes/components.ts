import { Router } from 'express';
import { pool } from '../db/pool.js';
import { asyncHandler, badRequest, notFound } from '../lib/errors.js';
import { assertUuid, pick, toCamel } from '../lib/scope.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router();

function componentShape(row: unknown) {
  const c = toCamel<Record<string, unknown>>(row);
  return {
    id: String(c.id),
    districtId: String(c.districtId),
    name: String(c.name),
    isActive: c.isActive !== false,
    sortOrder: Number(c.sortOrder ?? 0),
  };
}

/** GET /api/v1/components — the district's component registry. */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      'SELECT * FROM components WHERE district_id = $1 ORDER BY sort_order, name',
      [req.user!.districtId]
    );
    res.json({ items: rows.map(componentShape) });
  })
);

/** POST /api/v1/components {name, sortOrder?} — owner / district_admin. */
router.post(
  '/',
  requireRole('owner', 'district_admin'),
  asyncHandler(async (req, res) => {
    const name = String(req.body?.name ?? '').trim();
    if (!name) throw badRequest('MISSING_NAME', 'Give the component a name.');
    const sortOrder = Number(pick(req.body, 'sortOrder') ?? 0);
    try {
      const { rows } = await pool.query(
        `INSERT INTO components (district_id, name, sort_order)
         VALUES ($1, $2, $3) RETURNING *`,
        [req.user!.districtId, name, Number.isFinite(sortOrder) ? sortOrder : 0]
      );
      res.status(201).json(componentShape(rows[0]));
    } catch (err: unknown) {
      if ((err as { code?: string })?.code === '23505') {
        throw badRequest('DUPLICATE_COMPONENT', 'That component is already registered.');
      }
      throw err;
    }
  })
);

/** PATCH /api/v1/components/:id {name?, isActive?, sortOrder?} — owner / district_admin. */
router.patch(
  '/:id',
  requireRole('owner', 'district_admin'),
  asyncHandler(async (req, res) => {
    const id = assertUuid(req.params.id, 'component ID');
    const updates: string[] = [];
    const params: unknown[] = [];
    const add = (column: string, value: unknown): void => {
      params.push(value);
      updates.push(`${column} = $${params.length}`);
    };

    const name = req.body?.name;
    if (name !== undefined) {
      const n = String(name).trim();
      if (!n) throw badRequest('MISSING_NAME', 'Give the component a name.');
      add('name', n);
    }
    const isActive = pick(req.body, 'isActive');
    if (isActive !== undefined) add('is_active', Boolean(isActive));
    const sortOrder = pick(req.body, 'sortOrder');
    if (sortOrder !== undefined) {
      const n = Number(sortOrder);
      if (!Number.isFinite(n)) throw badRequest('INVALID_SORT', 'Sort order must be a number.');
      add('sort_order', n);
    }
    if (!updates.length) throw badRequest('NO_CHANGES', 'Nothing to update.');

    params.push(id, req.user!.districtId);
    try {
      const { rows } = await pool.query(
        `UPDATE components SET ${updates.join(', ')}
          WHERE id = $${params.length - 1} AND district_id = $${params.length}
          RETURNING *`,
        params
      );
      if (!rows.length) throw notFound('We could not find that component.');
      res.json(componentShape(rows[0]));
    } catch (err: unknown) {
      if ((err as { code?: string })?.code === '23505') {
        throw badRequest('DUPLICATE_COMPONENT', 'That component is already registered.');
      }
      throw err;
    }
  })
);

export default router;
