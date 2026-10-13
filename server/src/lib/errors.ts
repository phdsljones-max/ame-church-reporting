import type { NextFunction, Request, Response } from 'express';
import { logger } from './logger.js';

/**
 * Plain-language error envelope: every error response looks like
 *   { "error": { "code": "FORBIDDEN", "message": "You do not have access to this." } }
 * Database/driver messages are NEVER sent to the client.
 */
export class HttpError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const badRequest = (code: string, message: string) => new HttpError(400, code, message);
export const unauthorized = (code: string, message: string) => new HttpError(401, code, message);
export const forbidden = (message = 'You do not have access to this.') =>
  new HttpError(403, 'FORBIDDEN', message);
export const notFound = (message = 'We could not find that.') =>
  new HttpError(404, 'NOT_FOUND', message);

/** Wrap async route handlers so rejections reach the error handler. */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message } });
    return;
  }
  // Never leak driver/SQL details. Log internally, respond generically.
  if (err instanceof Error) {
    logger.error('Unhandled error:', err.message);
  } else {
    logger.error('Unhandled error:', err);
  }
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong on our end. Please try again.',
    },
  });
}
