import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db/pool.js';
import { config } from '../config.js';
import { asyncHandler, badRequest, unauthorized } from '../lib/errors.js';
import { publicUser } from './auth.js';

const router = Router();

/**
 * GET /api/v1/me -> {id, email, role, districtId, churchId, componentId}
 */
router.get(
  '/me',
  asyncHandler(async (req, res) => {
    const u = req.user!;
    res.json({
      id: u.id,
      email: u.email,
      role: u.role,
      districtId: u.districtId,
      churchId: u.churchId,
      componentId: u.componentId,
    });
  })
);

/** PATCH /api/v1/me/password {currentPassword, newPassword} */
router.patch(
  '/me/password',
  asyncHandler(async (req, res) => {
    const currentPassword = String(req.body?.currentPassword ?? '');
    const newPassword = String(req.body?.newPassword ?? '');
    if (newPassword.length < 8) {
      throw badRequest('WEAK_PASSWORD', 'Your new password must be at least 8 characters.');
    }
    const { rows } = await pool.query('SELECT password_hash FROM users WHERE id = $1', [
      req.user!.id,
    ]);
    const ok = await bcrypt.compare(currentPassword, rows[0]?.password_hash ?? '');
    if (!ok) throw unauthorized('INVALID_CREDENTIALS', 'Your current password is not correct.');

    const hash = await bcrypt.hash(newPassword, config.bcryptCost);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user!.id]);
    await pool.query('UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1', [req.user!.id]);
    res.json({ message: 'Your password has been changed. Please sign in again.' });
  })
);

export { publicUser };
export default router;
