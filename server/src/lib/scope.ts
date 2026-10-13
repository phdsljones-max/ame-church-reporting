import { pool } from '../db/pool.js';
import { badRequest, forbidden, notFound } from './errors.js';
import type { AuthUser } from '../middleware/auth.js';

/**
 * Shallow snake_case -> camelCase for DB rows. Nested JSONB values
 * (data, profile) are left untouched so user-entered keys round-trip
 * exactly as submitted.
 */
export function toCamel<T = Record<string, unknown>>(row: unknown): T {
  if (row === null || row === undefined) return row as T;
  if (Array.isArray(row)) return row.map((r) => toCamel(r)) as unknown as T;
  if (typeof row === 'object' && (row as object).constructor === Object) {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row as Record<string, unknown>)) {
      const camel = key.replace(/_([a-z])/g, (_m, c: string) => c.toUpperCase());
      out[camel] = value instanceof Date ? value.toISOString() : value;
    }
    return out as T;
  }
  return row as T;
}

/**
 * Read a request-body key accepting camelCase or snake_case.
 * pick(body, 'licenseTier') reads body.licenseTier ?? body.license_tier.
 */
export function pick(body: unknown, camel: string, snake?: string): unknown {
  if (!body || typeof body !== 'object') return undefined;
  const record = body as Record<string, unknown>;
  if (record[camel] !== undefined) return record[camel];
  const snakeKey = snake ?? camel.replace(/([A-Z])/g, (c) => `_${c.toLowerCase()}`);
  return record[snakeKey];
}

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function assertUuid(value: unknown, label = 'ID'): string {
  const v = String(value ?? '');
  if (!UUID_RE.test(v)) throw badRequest('INVALID_ID', `That ${label} does not look valid.`);
  return v;
}

export function assertYear(value: unknown): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 2000 || n > 2100) {
    throw badRequest('INVALID_YEAR', 'Enter a valid year.');
  }
  return n;
}

export function assertQuarter(value: unknown): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 4) {
    throw badRequest('INVALID_QUARTER', 'Quarter must be 1, 2, 3, or 4.');
  }
  return n;
}

export function assertMonth(value: unknown): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 12) {
    throw badRequest('INVALID_MONTH', 'Month must be between 1 and 12.');
  }
  return n;
}

/** Load a church that belongs to the user's district; 404 otherwise (no existence leak). */
export async function getDistrictChurch(districtId: string, churchId: string) {
  assertUuid(churchId, 'church ID');
  const { rows } = await pool.query(
    'SELECT * FROM churches WHERE id = $1 AND district_id = $2',
    [churchId, districtId]
  );
  if (!rows.length) throw notFound('We could not find that church.');
  return rows[0];
}

/** Load a component that belongs to the user's district; 404 otherwise. */
export async function getDistrictComponent(districtId: string, componentId: string) {
  assertUuid(componentId, 'component ID');
  const { rows } = await pool.query(
    'SELECT * FROM components WHERE id = $1 AND district_id = $2',
    [componentId, districtId]
  );
  if (!rows.length) throw notFound('We could not find that component.');
  return rows[0];
}

/** Who may READ a church's data. Cross-district is already impossible (district_id filter). */
export function assertChurchRead(user: AuthUser, churchId: string): void {
  if (['owner', 'district_admin', 'presiding_elder', 'bishop'].includes(user.role)) return;
  if (user.role === 'church_editor') {
    if (!user.churchId) {
      throw forbidden('Your account is not linked to a church yet. Ask your district administrator to link it.');
    }
    if (user.churchId !== churchId) throw forbidden();
    return;
  }
  if (user.role === 'component_leader') {
    if (user.churchId && user.churchId !== churchId) throw forbidden();
    return;
  }
  throw forbidden();
}

/** Who may WRITE a church's data (monthly reports, church-level written reports, church calendar). */
export function assertChurchWrite(user: AuthUser, churchId: string): void {
  if (user.role === 'owner' || user.role === 'district_admin') return;
  if (user.role === 'church_editor' && user.churchId === churchId) return;
  throw forbidden();
}

/** Who may READ a component's reports. */
export function assertComponentRead(user: AuthUser, componentId: string): void {
  if (['owner', 'district_admin', 'presiding_elder', 'bishop'].includes(user.role)) return;
  if (user.role === 'component_leader' && user.componentId === componentId) return;
  throw forbidden();
}

/** Who may WRITE a component's reports. */
export function assertComponentWrite(user: AuthUser, componentId: string): void {
  if (user.role === 'owner' || user.role === 'district_admin') return;
  if (user.role === 'component_leader' && user.componentId === componentId) return;
  throw forbidden();
}

/**
 * Written-report write scope. church_editor writes only their own
 * church's scope (`church:<churchId>`); component_leader writes only
 * their own component's scope (`component:<componentId>`).
 */
export function assertWrittenWrite(user: AuthUser, scopeKey: string): void {
  if (user.role === 'owner' || user.role === 'district_admin') return;
  if (user.role === 'church_editor' && user.churchId && scopeKey === `church:${user.churchId}`) return;
  if (user.role === 'component_leader' && user.componentId && scopeKey === `component:${user.componentId}`) return;
  throw forbidden();
}

/** True when a submitted report has no meaningful content (blank-submission guard). */
export function isBlankData(data: unknown): boolean {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return true;
  return !Object.values(data as Record<string, unknown>).some((value) => {
    if (value === null || value === undefined || value === '') return false;
    if (typeof value === 'object') return Object.keys(value as object).length > 0;
    return true;
  });
}

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}
