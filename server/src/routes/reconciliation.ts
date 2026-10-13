import { Router } from 'express';
import { pool } from '../db/pool.js';
import { HttpError, asyncHandler, badRequest } from '../lib/errors.js';
import { assertChurchRead, assertQuarter, assertUuid, assertYear, getDistrictChurch } from '../lib/scope.js';
import { quarterMonths, sumComponentReports, sumMonthlyNumeric } from '../lib/rollups.js';

const router = Router();

export interface ReconciliationFlag {
  key: string;
  componentTotal: number;
  pastorTotal: number;
  difference: number;
  note: string;
}

/**
 * GET /api/v1/reconciliation?churchId=&year=&quarter=
 * Non-blocking flags where submitted component report totals differ from the
 * pastor's monthly report totals for the same quarter. Informational only —
 * it never blocks submission.
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const churchIdRaw = req.query.churchId;
    if (!churchIdRaw) throw badRequest('MISSING_CHURCH', 'Choose a church.');
    const churchId = assertUuid(String(churchIdRaw), 'church ID');
    const church = await getDistrictChurch(user.districtId, churchId);

    if (
      !['owner', 'district_admin', 'presiding_elder', 'bishop'].includes(user.role)
    ) {
      // church_editor may reconcile their own church.
      if (user.role === 'church_editor' && user.churchId === churchId) {
        assertChurchRead(user, churchId);
      } else {
        throw new HttpError(403, 'FORBIDDEN', 'You do not have access to this.');
      }
    }

    const year = assertYear(req.query.year);
    const quarter = assertQuarter(req.query.quarter);
    const months = quarterMonths(quarter);

    const { totals: pastorTotals } = await sumMonthlyNumeric(
      pool,
      user.districtId,
      church.id,
      year,
      months
    );
    const componentTotals = await sumComponentReports(pool, user.districtId, church.id, year, quarter);

    const keys = new Set([...Object.keys(pastorTotals), ...Object.keys(componentTotals)]);
    const flags: ReconciliationFlag[] = [];
    for (const key of [...keys].sort()) {
      const pastorTotal = pastorTotals[key] ?? 0;
      const componentTotal = componentTotals[key] ?? 0;
      if (Math.abs(pastorTotal - componentTotal) > 1e-9) {
        flags.push({
          key,
          componentTotal,
          pastorTotal,
          difference: componentTotal - pastorTotal,
          note: `Component reports total ${componentTotal} but the pastor's monthly reports total ${pastorTotal} for "${key}".`,
        });
      }
    }

    res.json({
      churchId: church.id,
      year,
      quarter,
      months: [...months],
      flags,
      checkedAt: new Date().toISOString(),
    });
  })
);

export default router;
