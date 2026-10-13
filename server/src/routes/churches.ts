import { Router } from 'express';
import { pool } from '../db/pool.js';
import { asyncHandler, badRequest, notFound } from '../lib/errors.js';
import {
  assertChurchRead,
  assertUuid,
  getDistrictChurch,
  pick,
  toCamel,
} from '../lib/scope.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router();

function churchShape(row: unknown) {
  const c = toCamel<Record<string, unknown>>(row);
  return {
    id: String(c.id),
    districtId: String(c.districtId),
    peDistrictId: (c.peDistrictId as string | null) ?? null,
    name: String(c.name),
    address: (c.address as string | null) ?? null,
    city: (c.city as string | null) ?? null,
    state: (c.state as string | null) ?? null,
    zip: (c.zip as string | null) ?? null,
    phone: (c.phone as string | null) ?? null,
    email: (c.email as string | null) ?? null,
    pastorName: (c.pastorName as string | null) ?? null,
    pastorEmail: (c.pastorEmail as string | null) ?? null,
    pastorPhone: (c.pastorPhone as string | null) ?? null,
    profile: (c.profile as Record<string, unknown>) ?? {},
    isSample: c.isSample === true,
    createdAt: c.createdAt ? new Date(String(c.createdAt)).toISOString() : null,
  };
}

/** GET /api/v1/churches — district-scoped; church/component roles see their own church. */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const params: unknown[] = [user.districtId];
    let sql = 'SELECT * FROM churches WHERE district_id = $1';
    if ((user.role === 'church_editor' || user.role === 'component_leader') && user.churchId) {
      params.push(user.churchId);
      sql += ` AND id = $${params.length}`;
    }
    sql += ' ORDER BY name';
    const { rows } = await pool.query(sql, params);
    res.json({ items: rows.map(churchShape) });
  })
);

/** POST /api/v1/churches — owner / district_admin. */
router.post(
  '/',
  requireRole('owner', 'district_admin'),
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const name = String(req.body?.name ?? '').trim();
    if (!name) throw badRequest('MISSING_NAME', 'Give the church a name.');

    const peDistrictIdRaw = pick(req.body, 'peDistrictId');
    let peDistrictId: string | null = null;
    if (peDistrictIdRaw) {
      peDistrictId = assertUuid(String(peDistrictIdRaw), 'PE district ID');
      const { rows } = await pool.query(
        'SELECT id FROM pe_districts WHERE id = $1 AND district_id = $2',
        [peDistrictId, user.districtId]
      );
      if (!rows.length) throw badRequest('INVALID_PE_DISTRICT', 'That PE district does not exist.');
    }

    const profile = req.body?.profile;
    if (profile !== undefined && (typeof profile !== 'object' || profile === null || Array.isArray(profile))) {
      throw badRequest('INVALID_PROFILE', 'Profile must be an object.');
    }

    const { rows } = await pool.query(
      `INSERT INTO churches
         (district_id, pe_district_id, name, address, city, state, zip, phone, email,
          pastor_name, pastor_email, pastor_phone, profile)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb)
       RETURNING *`,
      [
        user.districtId,
        peDistrictId,
        name,
        String(pick(req.body, 'address') ?? '') || null,
        String(pick(req.body, 'city') ?? '') || null,
        String(pick(req.body, 'state') ?? '') || null,
        String(pick(req.body, 'zip') ?? '') || null,
        String(pick(req.body, 'phone') ?? '') || null,
        String(pick(req.body, 'email') ?? '') || null,
        String(pick(req.body, 'pastorName') ?? '') || null,
        String(pick(req.body, 'pastorEmail') ?? '') || null,
        String(pick(req.body, 'pastorPhone') ?? '') || null,
        JSON.stringify(profile ?? {}),
      ]
    );
    res.status(201).json(churchShape(rows[0]));
  })
);

/** GET /api/v1/churches/:id */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const church = await getDistrictChurch(user.districtId, req.params.id);
    assertChurchRead(user, church.id);
    res.json(churchShape(church));
  })
);

/** PATCH /api/v1/churches/:id — owner / district_admin. */
router.patch(
  '/:id',
  requireRole('owner', 'district_admin'),
  asyncHandler(async (req, res) => {
    const user = req.user!;
    await getDistrictChurch(user.districtId, req.params.id);

    const updates: string[] = [];
    const params: unknown[] = [];
    const add = (column: string, value: unknown): void => {
      params.push(value);
      updates.push(`${column} = $${params.length}`);
    };
    const str = (key: string, column: string): void => {
      const v = pick(req.body, key);
      if (v !== undefined) add(column, String(v) === '' ? null : String(v));
    };
    const nameRaw = pick(req.body, 'name');
    if (nameRaw !== undefined) {
      const name = String(nameRaw).trim();
      if (!name) throw badRequest('MISSING_NAME', 'Give the church a name.');
      add('name', name);
    }
    str('address', 'address');
    str('city', 'city');
    str('state', 'state');
    str('zip', 'zip');
    str('phone', 'phone');
    str('email', 'email');
    str('pastorName', 'pastor_name');
    str('pastorEmail', 'pastor_email');
    str('pastorPhone', 'pastor_phone');

    const peRaw = pick(req.body, 'peDistrictId');
    if (peRaw !== undefined) {
      if (!peRaw) {
        add('pe_district_id', null);
      } else {
        const peDistrictId = assertUuid(String(peRaw), 'PE district ID');
        const { rows } = await pool.query(
          'SELECT id FROM pe_districts WHERE id = $1 AND district_id = $2',
          [peDistrictId, user.districtId]
        );
        if (!rows.length) throw badRequest('INVALID_PE_DISTRICT', 'That PE district does not exist.');
        add('pe_district_id', peDistrictId);
      }
    }
    if (req.body?.profile !== undefined) {
      const profile = req.body.profile;
      if (typeof profile !== 'object' || profile === null || Array.isArray(profile)) {
        throw badRequest('INVALID_PROFILE', 'Profile must be an object.');
      }
      add('profile', JSON.stringify(profile));
    }

    if (!updates.length) throw badRequest('NO_CHANGES', 'Nothing to update.');
    params.push(req.params.id, user.districtId);
    const { rows } = await pool.query(
      `UPDATE churches SET ${updates.join(', ')}
        WHERE id = $${params.length - 1} AND district_id = $${params.length}
        RETURNING *`,
      params
    );
    if (!rows.length) throw notFound('We could not find that church.');
    res.json(churchShape(rows[0]));
  })
);

/** DELETE /api/v1/churches/:id — owner / district_admin. Cascades to the church's reports. */
router.delete(
  '/:id',
  requireRole('owner', 'district_admin'),
  asyncHandler(async (req, res) => {
    const user = req.user!;
    await getDistrictChurch(user.districtId, req.params.id);
    await pool.query('DELETE FROM churches WHERE id = $1 AND district_id = $2', [
      req.params.id,
      user.districtId,
    ]);
    res.json({ ok: true });
  })
);

export default router;
