import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../db/pool.js';
import { config } from '../config.js';
import { unauthorized } from '../lib/errors.js';

export type Role =
  | 'owner'
  | 'district_admin'
  | 'church_editor'
  | 'component_leader'
  | 'presiding_elder'
  | 'bishop';

export interface AuthUser {
  id: string;
  districtId: string;
  email: string;
  role: Role;
  churchId: string | null;
  componentId: string | null;
  districtActive: boolean;
  licenseExpiresAt: string | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * Verify the Bearer access token and load the user plus their district's
 * license state. Every downstream query scopes on req.user.districtId,
 * so cross-district access is impossible by construction.
 */
export async function authRequired(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw unauthorized('UNAUTHENTICATED', 'Please sign in to continue.');
    }
    const token = header.slice('Bearer '.length).trim();
    let payload: { sub?: string };
    try {
      payload = jwt.verify(token, config.jwtAccessSecret) as { sub?: string };
    } catch {
      throw unauthorized('SESSION_EXPIRED', 'Your session has expired. Please sign in again.');
    }
    if (!payload.sub) {
      throw unauthorized('SESSION_EXPIRED', 'Your session has expired. Please sign in again.');
    }

    const { rows } = await pool.query(
      `SELECT u.id, u.district_id, u.email, u.role, u.church_id, u.component_id, u.is_active,
              d.is_active AS district_active, d.license_expires_at
         FROM users u
         JOIN districts d ON d.id = u.district_id
        WHERE u.id = $1`,
      [payload.sub]
    );
    const row = rows[0];
    if (!row || !row.is_active) {
      throw unauthorized('ACCOUNT_INACTIVE', 'This account is no longer active.');
    }

    req.user = {
      id: row.id,
      districtId: row.district_id,
      email: row.email,
      role: row.role as Role,
      churchId: row.church_id,
      componentId: row.component_id,
      districtActive: row.district_active,
      licenseExpiresAt: row.license_expires_at
        ? new Date(row.license_expires_at).toISOString()
        : null,
    };
    next();
  } catch (err) {
    next(err);
  }
}
