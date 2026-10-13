import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { pool } from '../db/pool.js';
import { config } from '../config.js';
import { asyncHandler, badRequest, unauthorized } from '../lib/errors.js';
import { getMailer } from '../lib/mailer.js';
import { toCamel } from '../lib/scope.js';
import { logger } from '../lib/logger.js';

const router = Router();

const sha256 = (value: string): string =>
  crypto.createHash('sha256').update(value).digest('hex');

/** Public user shape: exactly what GET /api/v1/me returns. */
export function publicUser(row: unknown): {
  id: string;
  email: string;
  role: string;
  districtId: string;
  churchId: string | null;
  componentId: string | null;
} {
  const u = toCamel<Record<string, unknown>>(row);
  return {
    id: String(u.id),
    email: String(u.email),
    role: String(u.role),
    districtId: String(u.districtId),
    churchId: (u.churchId as string | null) ?? null,
    componentId: (u.componentId as string | null) ?? null,
  };
}

function signAccessToken(userId: string): string {
  return jwt.sign({ sub: userId }, config.jwtAccessSecret, {
    expiresIn: config.accessTokenTtl,
  });
}

async function issueRefreshToken(
  userId: string,
  familyId?: string
): Promise<{ token: string; familyId: string }> {
  const token = crypto.randomBytes(48).toString('hex');
  const family = familyId ?? crypto.randomUUID();
  const expiresAt = new Date(Date.now() + config.refreshTokenTtlMs);
  await pool.query(
    'INSERT INTO refresh_tokens (user_id, family_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)',
    [userId, family, sha256(token), expiresAt.toISOString()]
  );
  return { token, familyId: family };
}

const sessionExpired = () =>
  unauthorized('SESSION_EXPIRED', 'Your session has expired. Please sign in again.');

/**
 * POST /api/v1/auth/login {email, password}
 * -> {accessToken, refreshToken, user}
 * No public signup exists: the owner creates every account.
 */
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const email = String(req.body?.email ?? '').trim();
    const password = String(req.body?.password ?? '');
    if (!email || !password) {
      throw badRequest('MISSING_CREDENTIALS', 'Enter your email and password.');
    }

    const { rows } = await pool.query('SELECT * FROM users WHERE lower(email) = lower($1)', [email]);
    if (rows.length > 1) {
      throw badRequest(
        'AMBIGUOUS_ACCOUNT',
        'More than one account uses this email. Please contact your administrator.'
      );
    }
    const user = rows[0];
    if (!user) throw unauthorized('INVALID_CREDENTIALS', 'That email or password is not correct.');
    if (!user.is_active) throw unauthorized('ACCOUNT_INACTIVE', 'This account is no longer active.');

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) throw unauthorized('INVALID_CREDENTIALS', 'That email or password is not correct.');

    const accessToken = signAccessToken(user.id);
    const { token: refreshToken } = await issueRefreshToken(user.id);
    logger.info(`Login: ${user.email}`);
    res.json({ accessToken, refreshToken, user: publicUser(user) });
  })
);

/**
 * POST /api/v1/auth/refresh {refreshToken}
 * Rotates the refresh token. Reuse of a revoked token revokes the whole family.
 */
router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const presented = String(req.body?.refreshToken ?? '');
    if (!presented) throw badRequest('MISSING_TOKEN', 'A refresh token is required.');

    const { rows } = await pool.query('SELECT * FROM refresh_tokens WHERE token_hash = $1', [
      sha256(presented),
    ]);
    const stored = rows[0];
    if (!stored) throw sessionExpired();

    const expired = new Date(stored.expires_at).getTime() < Date.now();
    if (stored.revoked || expired) {
      if (stored.revoked) {
        await pool.query('UPDATE refresh_tokens SET revoked = TRUE WHERE family_id = $1', [
          stored.family_id,
        ]);
        logger.warn(`Refresh token reuse detected for user ${stored.user_id}; family revoked.`);
      }
      throw sessionExpired();
    }

    const { rows: userRows } = await pool.query('SELECT * FROM users WHERE id = $1', [
      stored.user_id,
    ]);
    const user = userRows[0];
    if (!user || !user.is_active) throw sessionExpired();

    await pool.query('UPDATE refresh_tokens SET revoked = TRUE WHERE id = $1', [stored.id]);
    const accessToken = signAccessToken(user.id);
    const { token: refreshToken } = await issueRefreshToken(user.id, stored.family_id);
    res.json({ accessToken, refreshToken, user: publicUser(user) });
  })
);

/** POST /api/v1/auth/logout {refreshToken?} -> always 200. */
router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const presented = String(req.body?.refreshToken ?? '');
    if (presented) {
      await pool.query('UPDATE refresh_tokens SET revoked = TRUE WHERE token_hash = $1', [
        sha256(presented),
      ]);
    }
    res.json({ ok: true });
  })
);

/**
 * POST /api/v1/auth/request-password-reset {email}
 * Always 200 (never reveals whether the email exists). The stub mailer
 * logs the reset token to the server console.
 */
router.post(
  '/request-password-reset',
  asyncHandler(async (req, res) => {
    const email = String(req.body?.email ?? '').trim();
    if (email) {
      const { rows } = await pool.query(
        'SELECT id, email FROM users WHERE lower(email) = lower($1) AND is_active = TRUE',
        [email]
      );
      const user = rows[0];
      if (user) {
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
        await pool.query(
          'INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
          [user.id, sha256(token), expiresAt.toISOString()]
        );
        await getMailer().sendPasswordReset(user.email, token);
      }
    }
    res.json({ message: 'If an account uses that email, a reset link was sent.' });
  })
);

/** POST /api/v1/auth/reset-password {token, newPassword} (bcrypt cost 12). */
router.post(
  '/reset-password',
  asyncHandler(async (req, res) => {
    const token = String(req.body?.token ?? '');
    const newPassword = String(req.body?.newPassword ?? '');
    if (!token) throw badRequest('MISSING_TOKEN', 'A reset token is required.');
    if (newPassword.length < 8) {
      throw badRequest('WEAK_PASSWORD', 'Your new password must be at least 8 characters.');
    }

    const { rows } = await pool.query('SELECT * FROM password_resets WHERE token_hash = $1', [
      sha256(token),
    ]);
    const reset = rows[0];
    const invalid =
      !reset || reset.used || new Date(reset.expires_at).getTime() < Date.now();
    if (invalid) {
      throw badRequest(
        'INVALID_TOKEN',
        'That reset link is invalid or has expired. Please request a new one.'
      );
    }

    const hash = await bcrypt.hash(newPassword, config.bcryptCost);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, reset.user_id]);
    await pool.query('UPDATE password_resets SET used = TRUE WHERE id = $1', [reset.id]);
    await pool.query('UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1', [
      reset.user_id,
    ]);
    logger.info(`Password reset completed for user ${reset.user_id}`);
    res.json({ message: 'Your password has been reset. Please sign in.' });
  })
);

export default router;
