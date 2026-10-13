import { Router } from 'express';
import { pool } from '../db/pool.js';
import { asyncHandler } from '../lib/errors.js';
import {
  assertChurchRead,
  assertQuarter,
  assertUuid,
  assertYear,
  escapeHtml,
  getDistrictChurch,
} from '../lib/scope.js';
import { annualRollup, quarterlyRollup } from '../lib/rollups.js';

const router = Router();

const BRAND_NAME = 'Phoenix Rising AI Solutions';
const BRAND_TAGLINE = 'Where Faith Meets the Future';
const COPYRIGHT = '© 2026 Phoenix Rising AI Solutions. All Rights Reserved.';

function page(title: string, heading: string, subheading: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
  body { font-family: Georgia, 'Times New Roman', serif; color: #222; max-width: 800px; margin: 0 auto; padding: 24px; }
  header.brand { text-align: center; border-bottom: 3px double #7a1f2b; padding-bottom: 12px; margin-bottom: 24px; }
  header.brand h1 { color: #7a1f2b; margin: 0 0 4px; font-size: 1.6rem; }
  header.brand p { color: #8a6d3b; margin: 0; font-style: italic; }
  h2 { color: #7a1f2b; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  th, td { border: 1px solid #ccc; padding: 8px 10px; text-align: left; }
  th { background: #f7f1e3; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  .muted { color: #666; }
  .notice { background: #fdf6e3; border: 1px solid #e6d9b8; padding: 10px 14px; border-radius: 6px; }
  footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #ccc; text-align: center; color: #666; font-size: 0.85rem; }
  pre.body { white-space: pre-wrap; font-family: inherit; }
  @media print { body { padding: 0; } .no-print { display: none; } }
</style>
</head>
<body>
<header class="brand">
  <h1>${escapeHtml(BRAND_NAME)}</h1>
  <p>${escapeHtml(BRAND_TAGLINE)}</p>
</header>
<h2>${escapeHtml(heading)}</h2>
<p class="muted">${escapeHtml(subheading)}</p>
${bodyHtml}
<footer>${escapeHtml(COPYRIGHT)}</footer>
</body>
</html>`;
}

function totalsTable(totals: Record<string, number>): string {
  const keys = Object.keys(totals).sort();
  if (!keys.length) {
    return '<p class="muted">No numbers were entered for this period yet.</p>';
  }
  const rows = keys
    .map(
      (k) =>
        `<tr><td>${escapeHtml(k)}</td><td class="num">${escapeHtml(totals[k])}</td></tr>`
    )
    .join('');
  return `<table><thead><tr><th>Field</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function missingNote(missingMonths: number[], label: (m: number) => string): string {
  if (!missingMonths.length) return '';
  return `<p class="notice">Not entered yet: ${missingMonths.map(label).map(escapeHtml).join(', ')}.</p>`;
}

function membershipHtml(auto: {
  opening: number | null;
  openingSource: string;
  accessions: number;
  transfersIn: number;
  transfersOut: number;
  deaths: number;
  closing: number | null;
}): string {
  const fmt = (v: number | null): string => (v === null ? 'Not entered' : String(v));
  return `<h3>Membership</h3>
<table><tbody>
<tr><td>Opening membership</td><td class="num">${escapeHtml(fmt(auto.opening))}</td></tr>
<tr><td>Accessions</td><td class="num">${escapeHtml(auto.accessions)}</td></tr>
<tr><td>Transfers in</td><td class="num">${escapeHtml(auto.transfersIn)}</td></tr>
<tr><td>Transfers out</td><td class="num">${escapeHtml(auto.transfersOut)}</td></tr>
<tr><td>Deaths</td><td class="num">${escapeHtml(auto.deaths)}</td></tr>
<tr><td><strong>Closing membership</strong></td><td class="num"><strong>${escapeHtml(fmt(auto.closing))}</strong></td></tr>
</tbody></table>
<p class="muted">Opening source: ${escapeHtml(auto.openingSource === 'not_entered' ? 'Not entered' : auto.openingSource === 'profile' ? 'Church profile' : 'Previous year-end')}.</p>`;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * GET /api/v1/exports/quarterly/:churchId/:year/:quarter
 * GET /api/v1/exports/annual/:churchId/:year
 * GET /api/v1/exports/composite/:id
 * Print-friendly HTML with brand header and copyright notice.
 * Exports stay available even when the district license is inactive (GET).
 */
router.get(
  '/quarterly/:churchId/:year/:quarter',
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const church = await getDistrictChurch(user.districtId, req.params.churchId);
    assertChurchRead(user, church.id);
    const year = assertYear(req.params.year);
    const quarter = assertQuarter(req.params.quarter);

    const rollup = await quarterlyRollup(pool, user.districtId, church.id, year, quarter);
    const body =
      totalsTable(rollup.totals) +
      missingNote(rollup.missingMonths, (m) => MONTH_NAMES[m - 1]) +
      membershipHtml(rollup.auto);
    res.type('html').send(
      page(
        `Quarterly Report — ${church.name} — Q${quarter} ${year}`,
        `Quarterly Church Report — Q${quarter} ${year}`,
        `${church.name} · Generated ${new Date().toLocaleDateString()}`,
        body
      )
    );
  })
);

router.get(
  '/annual/:churchId/:year',
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const church = await getDistrictChurch(user.districtId, req.params.churchId);
    assertChurchRead(user, church.id);
    const year = assertYear(req.params.year);

    const rollup = await annualRollup(pool, user.districtId, church.id, year);
    const quarterTables = rollup.quarters
      .map(
        (q) =>
          `<h3>Q${q.quarter}</h3>` +
          totalsTable(q.totals) +
          missingNote(q.missingMonths, (m) => MONTH_NAMES[m - 1])
      )
      .join('');
    const body =
      `<h3>Year totals</h3>` +
      totalsTable(rollup.totals) +
      membershipHtml(rollup.auto) +
      quarterTables;
    res.type('html').send(
      page(
        `Annual Report — ${church.name} — ${year}`,
        `Annual Church Report — ${year}`,
        `${church.name} · Generated ${new Date().toLocaleDateString()}`,
        body
      )
    );
  })
);

router.get(
  '/composite/:id',
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const id = assertUuid(req.params.id, 'report ID');
    const { rows } = await pool.query(
      'SELECT * FROM composite_reports WHERE id = $1 AND district_id = $2',
      [id, user.districtId]
    );
    if (!rows.length) {
      res.status(404).type('html').send(page('Not found', 'Not found', '', '<p>We could not find that report.</p>'));
      return;
    }
    const c = rows[0];
    // Read scoping mirrors the composite routes.
    if (
      !['owner', 'district_admin', 'presiding_elder', 'bishop'].includes(user.role)
    ) {
      const scopeKey = String(c.scope_key);
      const ok =
        (user.role === 'church_editor' &&
          user.churchId &&
          (scopeKey === `church:${user.churchId}` || c.church_id === user.churchId)) ||
        (user.role === 'component_leader' &&
          user.componentId &&
          scopeKey === `component:${user.componentId}`);
      if (!ok) {
        res.status(403).type('html').send(page('Not allowed', 'Not allowed', '', '<p>You do not have access to this.</p>'));
        return;
      }
    }

    const meta: string[] = [];
    if (c.addressees) meta.push(`<p><strong>To:</strong> ${escapeHtml(c.addressees)}</p>`);
    if (c.report_date) meta.push(`<p><strong>Date:</strong> ${escapeHtml(c.report_date)}</p>`);
    if (c.theme_scripture) meta.push(`<p><strong>Theme scripture:</strong> ${escapeHtml(c.theme_scripture)}</p>`);
    const sig: string[] = [];
    if (c.preparer_name) sig.push(`<p>Prepared by: ${escapeHtml(c.preparer_name)}${c.preparer_title ? `, ${escapeHtml(c.preparer_title)}` : ''}</p>`);
    if (c.secretary_name) sig.push(`<p>Secretary: ${escapeHtml(c.secretary_name)}</p>`);
    if (c.pastor_name) sig.push(`<p>Pastor: ${escapeHtml(c.pastor_name)}</p>`);

    const body =
      meta.join('') +
      `<pre class="body">${escapeHtml(c.body ?? '')}</pre>` +
      sig.join('') +
      `<p class="muted">Status: ${escapeHtml(c.status)}</p>`;
    res.type('html').send(
      page(
        `Composite Report — ${c.scope_key}`,
        'Composite Quarterly Conference Report',
        `Scope: ${c.scope_key} · ${c.level} · Q${c.quarter} ${c.year} · Generated ${new Date().toLocaleDateString()}`,
        body
      )
    );
  })
);

export default router;
