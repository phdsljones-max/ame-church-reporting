import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../lib/errors.js';

/**
 * License gate. When the district is inactive or its license has expired,
 * reads (GET) and exports stay available; every write
 * (POST/PUT/PATCH/DELETE) is rejected with LICENSE_INACTIVE.
 */
export function licenseGate(req: Request, _res: Response, next: NextFunction): void {
  const user = req.user;
  if (!user) {
    next();
    return;
  }
  const expired = user.licenseExpiresAt
    ? new Date(user.licenseExpiresAt).getTime() < Date.now()
    : false;
  const inactive = !user.districtActive || expired;

  if (inactive && req.method !== 'GET') {
    next(
      new HttpError(
        403,
        'LICENSE_INACTIVE',
        "This district's license is not active. Please contact Phoenix Rising AI Solutions."
      )
    );
    return;
  }
  next();
}
