import { Router } from 'express';
import { pool } from '../db/pool.js';
import { HttpError, asyncHandler, badRequest, notFound } from '../lib/errors.js';
import {
  assertUuid,
  assertYear,
  getDistrictChurch,
  pick,
  toCamel,
} from '../lib/scope.js';
import type { AuthUser } from '../middleware/auth.js';

const router = Router();
const LEVELS = ['church', 'district', 'conference'] as const;

function eventShape(row: unknown) {
  const e = toCamel<Record<string, unknown>>(row);
  const str = (v: unknown): string | null => (v === null || v === undefined ? null : String(v));
  return {
    id: String(e.id),
    districtId: String(e.districtId),
    churchId: (e.churchId as string | null) ?? null,
    level: String(e.level),
    title: String(e.title),
    startsAt: e.startsAt ? new Date(String(e.startsAt)).toISOString() : null,
    location: str(e.location),
    description: str(e.description),
    contact: str(e.contact),
    createdBy: (e.createdBy as string | null) ?? null,
    createdAt: e.createdAt ? new Date(String(e.createdAt)).toISOString() : null,
  };
}

/**
 * Who may create events. church_editor: church-level events for their own
 * church only. district_admin/owner: any level.
 */
function assertCalendarCreate(user: AuthUser, level: string, churchId: string | null): void {
  if (user.role === 'owner' || user.role === 'district_admin') return;
  if (user.role === 'church_editor' && level === 'church' && user.churchId && user.churchId === churchId) {
    return;
  }
  throw new HttpError(403, 'FORBIDDEN', 'You do not have access to this.');
}

/**
 * Who may edit/delete an event: its creator, a church_editor of the event's
 * church, a district_admin, or the owner.
 */
function assertCalendarOwnership(
  user: AuthUser,
  row: { created_by: string | null; church_id: string | null }
): void {
  if (user.role === 'owner' || user.role === 'district_admin') return;
  if (row.created_by && row.created_by === user.id) return;
  if (user.role === 'church_editor' && user.churchId && user.churchId === row.church_id) return;
  throw new HttpError(403, 'FORBIDDEN', 'You do not have access to this.');
}

/**
 * GET /api/v1/calendar-events?year=&level=&churchId=
 * Year-scoped listing. District and conference events are visible to all;
 * church-level events are narrowed to the requester's church for
 * church/component roles.
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const params: unknown[] = [user.districtId];
    const clauses = ['district_id = $1'];

    if (req.query.year !== undefined) {
      const year = assertYear(req.query.year);
      params.push(`${year}-01-01T00:00:00Z`, `${year + 1}-01-01T00:00:00Z`);
      clauses.push(`starts_at >= $${params.length - 1} AND starts_at < $${params.length}`);
    }
    if (req.query.level) {
      const level = String(req.query.level);
      if (!(LEVELS as readonly string[]).includes(level)) {
        throw badRequest('INVALID_LEVEL', 'Level must be church, district, or conference.');
      }
      params.push(level);
      clauses.push(`level = $${params.length}`);
    }
    if (req.query.churchId) {
      const churchId = assertUuid(String(req.query.churchId), 'church ID');
      await getDistrictChurch(user.districtId, churchId);
      params.push(churchId);
      clauses.push(`church_id = $${params.length}`);
    } else if ((user.role === 'church_editor' || user.role === 'component_leader') && user.churchId) {
      params.push(user.churchId);
      clauses.push(`(level <> 'church' OR church_id = $${params.length})`);
    }

    const { rows } = await pool.query(
      `SELECT * FROM calendar_events WHERE ${clauses.join(' AND ')} ORDER BY starts_at`,
      params
    );
    res.json({ items: rows.map(eventShape) });
  })
);

/** GET /api/v1/calendar-events/:id */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const id = assertUuid(req.params.id, 'event ID');
    const { rows } = await pool.query(
      'SELECT * FROM calendar_events WHERE id = $1 AND district_id = $2',
      [id, user.districtId]
    );
    if (!rows.length) throw notFound('We could not find that event.');
    const row = rows[0];
    if (
      row.level === 'church' &&
      (user.role === 'church_editor' || user.role === 'component_leader') &&
      user.churchId &&
      row.church_id !== user.churchId
    ) {
      throw new HttpError(403, 'FORBIDDEN', 'You do not have access to this.');
    }
    res.json(eventShape(row));
  })
);

/** POST /api/v1/calendar-events {level, churchId?, title, startsAt, location?, description?, contact?} */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const level = String(pick(req.body, 'level') ?? 'church');
    if (!(LEVELS as readonly string[]).includes(level)) {
      throw badRequest('INVALID_LEVEL', 'Level must be church, district, or conference.');
    }
    const title = String(pick(req.body, 'title') ?? '').trim();
    if (!title) throw badRequest('MISSING_TITLE', 'Give the event a title.');
    const startsAtRaw = pick(req.body, 'startsAt');
    if (!startsAtRaw) throw badRequest('MISSING_DATE', 'Choose a date and time for the event.');
    const startsAt = new Date(String(startsAtRaw));
    if (Number.isNaN(startsAt.getTime())) {
      throw badRequest('INVALID_DATE', 'Enter a valid date and time.');
    }

    let churchId: string | null = null;
    const churchIdRaw = pick(req.body, 'churchId');
    if (level === 'church') {
      if (churchIdRaw) {
        churchId = assertUuid(String(churchIdRaw), 'church ID');
      } else if (user.churchId) {
        churchId = user.churchId;
      } else {
        throw badRequest('MISSING_CHURCH', 'Choose a church for this church-level event.');
      }
      await getDistrictChurch(user.districtId, churchId);
    }
    assertCalendarCreate(user, level, churchId);

    const { rows } = await pool.query(
      `INSERT INTO calendar_events
         (district_id, church_id, level, title, starts_at, location, description, contact, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        user.districtId,
        churchId,
        level,
        title,
        startsAt.toISOString(),
        strOrNull(pick(req.body, 'location')),
        strOrNull(pick(req.body, 'description')),
        strOrNull(pick(req.body, 'contact')),
        user.id,
      ]
    );
    res.status(201).json(eventShape(rows[0]));
  })
);

function strOrNull(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const s = String(value);
  return s === '' ? null : s;
}

/** PATCH /api/v1/calendar-events/:id — creator, own-church editor, district_admin, owner. */
router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const id = assertUuid(req.params.id, 'event ID');
    const { rows: existing } = await pool.query(
      'SELECT * FROM calendar_events WHERE id = $1 AND district_id = $2',
      [id, user.districtId]
    );
    if (!existing.length) throw notFound('We could not find that event.');
    assertCalendarOwnership(user, existing[0]);

    const updates: string[] = [];
    const params: unknown[] = [];
    const add = (column: string, value: unknown): void => {
      params.push(value);
      updates.push(`${column} = $${params.length}`);
    };
    const title = pick(req.body, 'title');
    if (title !== undefined) {
      const t = String(title).trim();
      if (!t) throw badRequest('MISSING_TITLE', 'Give the event a title.');
      add('title', t);
    }
    const startsAtRaw = pick(req.body, 'startsAt');
    if (startsAtRaw !== undefined) {
      const d = new Date(String(startsAtRaw));
      if (Number.isNaN(d.getTime())) throw badRequest('INVALID_DATE', 'Enter a valid date and time.');
      add('starts_at', d.toISOString());
    }
    const textField = (key: string, column: string): void => {
      const v = pick(req.body, key);
      if (v !== undefined) add(column, strOrNull(v));
    };
    textField('location', 'location');
    textField('description', 'description');
    textField('contact', 'contact');

    if (!updates.length) throw badRequest('NO_CHANGES', 'Nothing to update.');
    params.push(id, user.districtId);
    const { rows } = await pool.query(
      `UPDATE calendar_events SET ${updates.join(', ')}
        WHERE id = $${params.length - 1} AND district_id = $${params.length}
        RETURNING *`,
      params
    );
    res.json(eventShape(rows[0]));
  })
);

/** DELETE /api/v1/calendar-events/:id — creator, own-church editor, district_admin, owner. */
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const id = assertUuid(req.params.id, 'event ID');
    const { rows: existing } = await pool.query(
      'SELECT * FROM calendar_events WHERE id = $1 AND district_id = $2',
      [id, user.districtId]
    );
    if (!existing.length) throw notFound('We could not find that event.');
    assertCalendarOwnership(user, existing[0]);
    await pool.query('DELETE FROM calendar_events WHERE id = $1', [id]);
    res.json({ ok: true });
  })
);

export default router;
