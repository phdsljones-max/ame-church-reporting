import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db/pool.js';
import { config } from '../config.js';
import { asyncHandler, badRequest, forbidden, notFound } from '../lib/errors.js';
import { assertUuid, getDistrictChurch, getDistrictComponent, pick, toCamel } from '../lib/scope.js';
import { requireRole } from '../middleware/requireRole.js';
import type { Role } from '../middleware/auth.js';
import type { AuthUser } from '../middleware/auth.js';

const router = Router();
const MANAGE = requireRole('owner', 'district_admin');

const VALID_ROLES: Role[] = [
  'owner',
  'district_admin',
  'church_editor',
  'component_leader',
  'presiding_elder',
  'bishop',
];

function userShape(row: unknown) {
  const u = toCamel<Record<string, unknown>>(row);
  return {
    id: String(u.id),
    districtId: String(u.districtId),
    email: String(u.email),
    role: String(u.role),
    churchId: (u.churchId as string | null) ?? null,
    componentId: (u.componentId as string | null) ?? null,
    isActive: u.isActive !== false,
    createdAt: u.createdAt ? new Date(String(u.createdAt)).toISOString() : null,
  };
}

const USER_COLUMNS =
  'id, district_id, email, role, church_id, component_id, is_active, created_at';

/** Load a user row visible to the requester (district-scoped). */
async function getManagedUser(requester: AuthUser, id: string) {
  assertUuid(id, 'user ID');
  const { rows } = await pool.query(`SELECT ${USER_COLUMNS} FROM users WHERE id = $1`, [id]);
  const row = rows[0];
  if (!row) throw notFound('We could not find that account.');
  if (requester.role !== 'owner' && row.district_id !== requester.districtId) {
    throw notFound('We could not find that account.');
  }
  return row;
}

/** GET /api/v1/users — owner may pass ?districtId=; district_admin sees own district. */
router.get(
  '/',
  MANAGE,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    let districtId = user.districtId;
    if (user.role === 'owner' && req.query.districtId) {
      districtId = assertUuid(String(req.query.districtId), 'district ID');
    }
    const { rows } = await pool.query(
      `SELECT ${USER_COLUMNS} FROM users WHERE district_id = $1 ORDER BY email`,
      [districtId]
    );
    res.json({ items: rows.map(userShape) });
  })
);

/**
 * POST /api/v1/users {email, password, role, districtId?, churchId?, componentId?}
 * Owner creates every account — there is no public signup.
 * district_admin: own district only, and can never create 'owner'.
 */
router.post(
  '/',
  MANAGE,
  asyncHandler(async (req, res) => {
    const creator = req.user!;
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const password = String(req.body?.password ?? '');
    const role = String(req.body?.role ?? '');

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      throw badRequest('INVALID_EMAIL', 'Enter a valid email address.');
    }
    if (password.length < 8) {
      throw badRequest('WEAK_PASSWORD', 'The password must be at least 8 characters.');
    }
    if (!VALID_ROLES.includes(role as Role)) {
      throw badRequest('INVALID_ROLE', 'Choose a valid role for this account.');
    }
    if (creator.role === 'district_admin' && role === 'owner') {
      throw forbidden('Only the owner can create owner accounts.');
    }

    let districtId = creator.districtId;
    if (creator.role === 'owner') {
      const requested = pick(req.body, 'districtId');
      if (requested !== undefined && requested !== null && requested !== '') {
        districtId = assertUuid(String(requested), 'district ID');
      }
    }
    const { rows: drows } = await pool.query('SELECT id FROM districts WHERE id = $1', [districtId]);
    if (!drows.length) throw badRequest('INVALID_DISTRICT', 'That district does not exist.');

    const churchIdRaw = pick(req.body, 'churchId');
    const componentIdRaw = pick(req.body, 'componentId');
    const churchId = churchIdRaw ? String(churchIdRaw) : null;
    const componentId = componentIdRaw ? String(componentIdRaw) : null;
    if (churchId) await getDistrictChurch(districtId, churchId);
    if (componentId) await getDistrictComponent(districtId, componentId);

    const hash = await bcrypt.hash(password, config.bcryptCost);
    try {
      const { rows } = await pool.query(
        `INSERT INTO users (district_id, email, password_hash, role, church_id, component_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING ${USER_COLUMNS}`,
        [districtId, email, hash, role, churchId, componentId]
      );
      res.status(201).json(userShape(rows[0]));
    } catch (err: unknown) {
      if ((err as { code?: string })?.code === '23505') {
        throw badRequest(
          'EMAIL_TAKEN',
          'An account with that email already exists in this district.'
        );
      }
      throw err;
    }
  })
);

/** GET /api/v1/users/:id */
router.get(
  '/:id',
  MANAGE,
  asyncHandler(async (req, res) => {
    const row = await getManagedUser(req.user!, req.params.id);
    res.json(userShape(row));
  })
);

/** PATCH /api/v1/users/:id {role?, isActive?, churchId?, componentId?} */
router.patch(
  '/:id',
  MANAGE,
  asyncHandler(async (req, res) => {
    const editor = req.user!;
    const row = await getManagedUser(editor, req.params.id);

    if (editor.role === 'district_admin' && row.role === 'owner') {
      throw forbidden('Only the owner can change owner accounts.');
    }
    if (row.id === editor.id && pick(req.body, 'isActive') === false) {
      throw badRequest('SELF_DEACTIVATE', 'You cannot deactivate your own account.');
    }

    const updates: string[] = [];
    const params: unknown[] = [];
    const add = (column: string, value: unknown): void => {
      params.push(value);
      updates.push(`${column} = $${params.length}`);
    };

    const role = req.body?.role;
    if (role !== undefined) {
      if (!VALID_ROLES.includes(role as Role)) {
        throw badRequest('INVALID_ROLE', 'Choose a valid role for this account.');
      }
      if (editor.role === 'district_admin' && role === 'owner') {
        throw forbidden('Only the owner can create owner accounts.');
      }
      add('role', role);
    }
    const isActive = pick(req.body, 'isActive');
    if (isActive !== undefined) add('is_active', Boolean(isActive));

    const churchIdRaw = pick(req.body, 'churchId');
    if (churchIdRaw !== undefined) {
      const churchId = churchIdRaw ? String(churchIdRaw) : null;
      if (churchId) await getDistrictChurch(row.district_id, churchId);
      add('church_id', churchId);
    }
    const componentIdRaw = pick(req.body, 'componentId');
    if (componentIdRaw !== undefined) {
      const componentId = componentIdRaw ? String(componentIdRaw) : null;
      if (componentId) await getDistrictComponent(row.district_id, componentId);
      add('component_id', componentId);
    }

    if (!updates.length) throw badRequest('NO_CHANGES', 'Nothing to update.');
    params.push(row.id);
    const { rows } = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING ${USER_COLUMNS}`,
      params
    );
    res.json(userShape(rows[0]));
  })
);

/**
 * DELETE /api/v1/users/:id — deactivates the account (soft delete, keeps history).
 */
router.delete(
  '/:id',
  MANAGE,
  asyncHandler(async (req, res) => {
    const editor = req.user!;
    const row = await getManagedUser(editor, req.params.id);
    if (editor.role === 'district_admin' && row.role === 'owner') {
      throw forbidden('Only the owner can change owner accounts.');
    }
    if (row.id === editor.id) {
      throw badRequest('SELF_DEACTIVATE', 'You cannot deactivate your own account.');
    }
    const { rows } = await pool.query(
      `UPDATE users SET is_active = FALSE WHERE id = $1 RETURNING ${USER_COLUMNS}`,
      [row.id]
    );
    await pool.query('UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1', [row.id]);
    res.json(userShape(rows[0]));
  })
);

export default router;
