import type { NextFunction, Request, Response } from 'express';
import { forbidden } from '../lib/errors.js';
import type { Role } from './auth.js';

/** Allow only the listed roles; everyone else gets a plain-language 403. */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      next(forbidden());
      return;
    }
    next();
  };
}

/**
 * Roles allowed to change data. presiding_elder and bishop are
 * intentionally read-only everywhere.
 */
export const WRITER_ROLES: Role[] = [
  'owner',
  'district_admin',
  'church_editor',
  'component_leader',
];

export function requireWriter() {
  return requireRole(...WRITER_ROLES);
}
