import { Router } from 'express';
import { pool } from '../db/pool.js';
import { asyncHandler } from '../lib/errors.js';
import { assertChurchRead, assertQuarter, assertYear, getDistrictChurch } from '../lib/scope.js';
import { annualRollup, quarterlyRollup } from '../lib/rollups.js';

const router = Router({ mergeParams: true });

/**
 * GET /api/v1/churches/:churchId/quarterly/:year/:quarter
 * -> {churchId, year, quarter, months, missingMonths, totals, auto}
 * `auto` is the auto-computed membership:
 * {opening, openingSource, accessions, transfersIn, transfersOut, deaths, closing}.
 * Unknown values are null / listed in missingMonths so the UI shows "Not entered".
 */
router.get(
  '/quarterly/:year/:quarter',
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const church = await getDistrictChurch(user.districtId, String(req.params.churchId));
    assertChurchRead(user, church.id);
    const year = assertYear(req.params.year);
    const quarter = assertQuarter(req.params.quarter);
    res.json(await quarterlyRollup(pool, user.districtId, church.id, year, quarter));
  })
);

/**
 * GET /api/v1/churches/:churchId/annual/:year
 * -> {churchId, year, totals, presentMonths, missingMonths, auto, quarters[]}
 */
router.get(
  '/annual/:year',
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const church = await getDistrictChurch(user.districtId, String(req.params.churchId));
    assertChurchRead(user, church.id);
    const year = assertYear(req.params.year);
    res.json(await annualRollup(pool, user.districtId, church.id, year));
  })
);

export default router;
