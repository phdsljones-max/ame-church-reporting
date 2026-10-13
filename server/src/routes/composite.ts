import { Router } from 'express';
import { pool } from '../db/pool.js';
import { HttpError, asyncHandler, badRequest, notFound } from '../lib/errors.js';
import {
  assertQuarter,
  assertUuid,
  assertYear,
  getDistrictChurch,
  pick,
  toCamel,
} from '../lib/scope.js';
import type { AuthUser } from '../middleware/auth.js';

const router = Router();
const LEVELS = ['church', 'district', 'conference', 'connectional'] as const;

function compositeShape(row: unknown) {
  const c = toCamel<Record<string, unknown>>(row);
  const str = (v: unknown): string | null => (v === null || v === undefined ? null : String(v));
  return {
    id: String(c.id),
    districtId: String(c.districtId),
    scopeKey: String(c.scopeKey),
    churchId: (c.churchId as string | null) ?? null,
    level: String(c.level),
    year: Number(c.year),
    quarter: Number(c.quarter),
    reportDate: str(c.reportDate),
    annualYearLabel: str(c.annualYearLabel),
    themeScripture: str(c.themeScripture),
    addressees: str(c.addressees),
    openingParagraph: str(c.openingParagraph),
    closingParagraph: str(c.closingParagraph),
    preparerName: str(c.preparerName),
    preparerTitle: str(c.preparerTitle),
    secretaryName: str(c.secretaryName),
    pastorName: str(c.pastorName),
    body: str(c.body),
    status: String(c.status),
    createdAt: c.createdAt ? new Date(String(c.createdAt)).toISOString() : null,
    updatedAt: c.updatedAt ? new Date(String(c.updatedAt)).toISOString() : null,
  };
}

/**
 * Who may assemble/finalize a composite. owner/district_admin: anything.
 * church_editor: church-level composites for their own church only.
 */
function assertCompositeWrite(user: AuthUser, level: string, scopeKey: string): void {
  if (user.role === 'owner' || user.role === 'district_admin') return;
  if (
    user.role === 'church_editor' &&
    level === 'church' &&
    user.churchId &&
    scopeKey === `church:${user.churchId}`
  ) {
    return;
  }
  throw new HttpError(403, 'FORBIDDEN', 'You do not have access to this.');
}

function assertCompositeRead(user: AuthUser, level: string, scopeKey: string, churchId: string | null): void {
  if (['owner', 'district_admin', 'presiding_elder', 'bishop'].includes(user.role)) return;
  if (
    user.role === 'church_editor' &&
    user.churchId &&
    (scopeKey === `church:${user.churchId}` || churchId === user.churchId)
  ) {
    return;
  }
  if (user.role === 'component_leader' && user.componentId && scopeKey === `component:${user.componentId}`) {
    return;
  }
  throw new HttpError(403, 'FORBIDDEN', 'You do not have access to this.');
}

interface Contribution {
  contributor_name: string | null;
  activities: string | null;
  events_held: string | null;
  people_to_recognize: string | null;
  needs: string | null;
  additional_notes: string | null;
  submitted_by: string | null;
}

function buildCompositeBody(
  input: {
    addressees?: string;
    reportDate?: string;
    annualYearLabel?: string;
    themeScripture?: string;
    openingParagraph?: string;
    closingParagraph?: string;
    preparerName?: string;
    preparerTitle?: string;
    secretaryName?: string;
    pastorName?: string;
  },
  contributions: Contribution[]
): string {
  const lines: string[] = [];
  if (input.addressees) lines.push(`To: ${input.addressees}`);
  if (input.reportDate) lines.push(`Date: ${input.reportDate}`);
  if (input.annualYearLabel) lines.push(`Conference year: ${input.annualYearLabel}`);
  if (input.themeScripture) lines.push(`Theme scripture: ${input.themeScripture}`);
  if (lines.length) lines.push('');
  if (input.openingParagraph) {
    lines.push(input.openingParagraph, '');
  }
  contributions.forEach((c, index) => {
    lines.push(`--- ${c.contributor_name || `Contribution ${index + 1}`} ---`);
    if (c.activities) lines.push(`Activities: ${c.activities}`);
    if (c.events_held) lines.push(`Events held: ${c.events_held}`);
    if (c.people_to_recognize) lines.push(`People to recognize: ${c.people_to_recognize}`);
    if (c.needs) lines.push(`Needs: ${c.needs}`);
    if (c.additional_notes) lines.push(`Additional notes: ${c.additional_notes}`);
    if (c.submitted_by) lines.push(`(Submitted by ${c.submitted_by})`);
    lines.push('');
  });
  if (input.closingParagraph) {
    lines.push(input.closingParagraph, '');
  }
  if (input.preparerName) {
    lines.push(`Prepared by: ${input.preparerName}${input.preparerTitle ? `, ${input.preparerTitle}` : ''}`);
  }
  if (input.secretaryName) lines.push(`Secretary: ${input.secretaryName}`);
  if (input.pastorName) lines.push(`Pastor: ${input.pastorName}`);
  return lines.join('\n');
}

/**
 * GET /api/v1/composite-reports?scopeKey=&level=&year=&quarter=
 * -> {items: [...]}
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const params: unknown[] = [user.districtId];
    const clauses = ['district_id = $1'];
    if (req.query.scopeKey) {
      params.push(String(req.query.scopeKey));
      clauses.push(`scope_key = $${params.length}`);
    }
    if (req.query.level) {
      const level = String(req.query.level);
      if (!(LEVELS as readonly string[]).includes(level)) {
        throw badRequest('INVALID_LEVEL', 'Level must be church, district, conference, or connectional.');
      }
      params.push(level);
      clauses.push(`level = $${params.length}`);
    }
    if (req.query.year !== undefined) {
      params.push(assertYear(req.query.year));
      clauses.push(`year = $${params.length}`);
    }
    if (req.query.quarter !== undefined) {
      params.push(assertQuarter(req.query.quarter));
      clauses.push(`quarter = $${params.length}`);
    }
    const { rows } = await pool.query(
      `SELECT * FROM composite_reports WHERE ${clauses.join(' AND ')} ORDER BY year, quarter`,
      params
    );
    const items = rows.map(compositeShape).filter((r) => {
      try {
        assertCompositeRead(user, r.level, r.scopeKey, r.churchId);
        return true;
      } catch {
        return false;
      }
    });
    res.json({ items });
  })
);

/** GET /api/v1/composite-reports/:id — the rendered composite. */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const id = assertUuid(req.params.id, 'report ID');
    const { rows } = await pool.query(
      'SELECT * FROM composite_reports WHERE id = $1 AND district_id = $2',
      [id, user.districtId]
    );
    if (!rows.length) throw notFound('We could not find that report.');
    const shaped = compositeShape(rows[0]);
    assertCompositeRead(user, shaped.level, shaped.scopeKey, shaped.churchId);
    res.json(shaped);
  })
);

/**
 * POST /api/v1/composite-reports/assemble
 * Builds the composite body from the scope's submitted written reports
 * (in contributor order) plus letterhead/theme/signature fields, and saves
 * it as a draft. -> the saved composite (including its id).
 */
router.post(
  '/assemble',
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const scopeKey = String(pick(req.body, 'scopeKey') ?? '').trim();
    if (!scopeKey) throw badRequest('MISSING_SCOPE', 'Choose what this report is for.');
    const level = String(pick(req.body, 'level') ?? 'church');
    if (!(LEVELS as readonly string[]).includes(level)) {
      throw badRequest('INVALID_LEVEL', 'Level must be church, district, conference, or connectional.');
    }
    const year = assertYear(pick(req.body, 'year'));
    const quarter = assertQuarter(pick(req.body, 'quarter'));
    assertCompositeWrite(user, level, scopeKey);

    const churchIdRaw = pick(req.body, 'churchId');
    let churchId: string | null = null;
    if (churchIdRaw) {
      churchId = assertUuid(String(churchIdRaw), 'church ID');
      await getDistrictChurch(user.districtId, churchId);
    } else if (scopeKey.startsWith('church:')) {
      churchId = assertUuid(scopeKey.slice('church:'.length), 'church ID');
      await getDistrictChurch(user.districtId, churchId);
    }

    const input = {
      addressees: strOrUndef(pick(req.body, 'addressees')),
      reportDate: strOrUndef(pick(req.body, 'reportDate')),
      annualYearLabel: strOrUndef(pick(req.body, 'annualYearLabel')),
      themeScripture: strOrUndef(pick(req.body, 'themeScripture')),
      openingParagraph: strOrUndef(pick(req.body, 'openingParagraph')),
      closingParagraph: strOrUndef(pick(req.body, 'closingParagraph')),
      preparerName: strOrUndef(pick(req.body, 'preparerName')),
      preparerTitle: strOrUndef(pick(req.body, 'preparerTitle')),
      secretaryName: strOrUndef(pick(req.body, 'secretaryName')),
      pastorName: strOrUndef(pick(req.body, 'pastorName')),
    };

    const { rows: contributions } = await pool.query(
      `SELECT contributor_name, activities, events_held, people_to_recognize,
              needs, additional_notes, submitted_by
         FROM written_reports
        WHERE district_id = $1 AND scope_key = $2 AND level = $3
          AND year = $4 AND quarter = $5 AND status = 'submitted'
        ORDER BY created_at`,
      [user.districtId, scopeKey, level, year, quarter]
    );
    const body = buildCompositeBody(input, contributions as Contribution[]);

    const { rows } = await pool.query(
      `INSERT INTO composite_reports
         (district_id, scope_key, church_id, level, year, quarter,
          report_date, annual_year_label, theme_scripture, addressees,
          opening_paragraph, closing_paragraph,
          preparer_name, preparer_title, secretary_name, pastor_name, body, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,'draft')
       ON CONFLICT (district_id, scope_key, level, year, quarter)
       DO UPDATE SET report_date = EXCLUDED.report_date,
                     annual_year_label = EXCLUDED.annual_year_label,
                     theme_scripture = EXCLUDED.theme_scripture,
                     addressees = EXCLUDED.addressees,
                     opening_paragraph = EXCLUDED.opening_paragraph,
                     closing_paragraph = EXCLUDED.closing_paragraph,
                     preparer_name = EXCLUDED.preparer_name,
                     preparer_title = EXCLUDED.preparer_title,
                     secretary_name = EXCLUDED.secretary_name,
                     pastor_name = EXCLUDED.pastor_name,
                     body = EXCLUDED.body,
                     updated_at = NOW()
       RETURNING *`,
      [
        user.districtId,
        scopeKey,
        churchId,
        level,
        year,
        quarter,
        input.reportDate ?? null,
        input.annualYearLabel ?? null,
        input.themeScripture ?? null,
        input.addressees ?? null,
        input.openingParagraph ?? null,
        input.closingParagraph ?? null,
        input.preparerName ?? null,
        input.preparerTitle ?? null,
        input.secretaryName ?? null,
        input.pastorName ?? null,
        body,
      ]
    );
    res.json(compositeShape(rows[0]));
  })
);

function strOrUndef(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  return String(value);
}

/**
 * PATCH /api/v1/composite-reports/:id
 * {status?: 'draft'|'finalized', reportDate?, annualYearLabel?, themeScripture?,
 *  addressees?, openingParagraph?, closingParagraph?, preparerName?,
 *  preparerTitle?, secretaryName?, pastorName?}
 * Setting status to 'finalized' is the finalize step.
 */
router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const id = assertUuid(req.params.id, 'report ID');
    const { rows: existing } = await pool.query(
      'SELECT * FROM composite_reports WHERE id = $1 AND district_id = $2',
      [id, user.districtId]
    );
    if (!existing.length) throw notFound('We could not find that report.');
    const current = compositeShape(existing[0]);
    assertCompositeWrite(user, current.level, current.scopeKey);

    const updates: string[] = [];
    const params: unknown[] = [];
    const add = (column: string, value: unknown): void => {
      params.push(value);
      updates.push(`${column} = $${params.length}`);
    };
    const textField = (key: string, column: string): void => {
      const v = pick(req.body, key);
      if (v !== undefined) add(column, v === null || v === '' ? null : String(v));
    };
    textField('reportDate', 'report_date');
    textField('annualYearLabel', 'annual_year_label');
    textField('themeScripture', 'theme_scripture');
    textField('addressees', 'addressees');
    textField('openingParagraph', 'opening_paragraph');
    textField('closingParagraph', 'closing_paragraph');
    textField('preparerName', 'preparer_name');
    textField('preparerTitle', 'preparer_title');
    textField('secretaryName', 'secretary_name');
    textField('pastorName', 'pastor_name');

    const status = pick(req.body, 'status');
    if (status !== undefined) {
      const s = String(status);
      if (!['draft', 'finalized'].includes(s)) {
        throw badRequest('INVALID_STATUS', 'Status must be "draft" or "finalized".');
      }
      add('status', s);
    }
    if (!updates.length) throw badRequest('NO_CHANGES', 'Nothing to update.');
    updates.push('updated_at = NOW()');

    params.push(id, user.districtId);
    const { rows } = await pool.query(
      `UPDATE composite_reports SET ${updates.join(', ')}
        WHERE id = $${params.length - 1} AND district_id = $${params.length}
        RETURNING *`,
      params
    );
    res.json(compositeShape(rows[0]));
  })
);

export default router;
