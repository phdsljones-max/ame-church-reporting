import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  api,
  createChurch,
  createDistrict,
  createUser,
  deleteDistrict,
  login,
  rnd,
} from './helpers.js';
import { pool } from '../src/db/pool.js';

describe('server-side rollups', () => {
  const s = rnd();
  let district: any;
  let church: any;
  let admin = '';

  const putMonth = (month: number, data: Record<string, unknown>, status = 'draft') =>
    api('PUT', `/api/v1/churches/${church.id}/monthly-reports/2026/${month}`, admin, {
      data,
      status,
    });

  beforeAll(async () => {
    district = await createDistrict(`Rollup District ${s}`);
    church = await createChurch(district.id, `Rollup Church ${s}`);
    await createUser(district.id, `rollup-admin-${s}@test.local`, 'district_admin');
    admin = (await login(`rollup-admin-${s}@test.local`)).accessToken;

    // Oct / Nov / Dec 2026
    await putMonth(10, { attendance: 100, servicesHeld: 4, fundsRaised: 1000 });
    await putMonth(11, { attendance: 200, servicesHeld: 5, fundsRaised: 2000 });
    await putMonth(12, { attendance: 300, servicesHeld: 6, fundsRaised: 3000 });
  });

  afterAll(async () => {
    await deleteDistrict(district.id);
  });

  it('quarterly totals sum the three months exactly', async () => {
    const { status, body } = await api('GET', `/api/v1/churches/${church.id}/quarterly/2026/4`, admin);
    expect(status).toBe(200);
    expect(body.totals.attendance).toBe(600);
    expect(body.totals.servicesHeld).toBe(15);
    expect(body.totals.fundsRaised).toBe(6000);
    expect(body.missingMonths).toEqual([]);
    expect(body.months).toEqual([10, 11, 12]);
  });

  it('annual rollup matches the quarterly totals', async () => {
    const { status, body } = await api('GET', `/api/v1/churches/${church.id}/annual/2026`, admin);
    expect(status).toBe(200);
    expect(body.totals.attendance).toBe(600);
    expect(body.totals.servicesHeld).toBe(15);
    expect(body.totals.fundsRaised).toBe(6000);
    // Jan-Sep missing (9 months)
    expect(body.missingMonths).toHaveLength(9);
    expect(body.quarters).toHaveLength(4);
  });

  it('a missing month appears in missingMonths and contributes nothing', async () => {
    await api('DELETE', `/api/v1/churches/${church.id}/monthly-reports/2026/12`, admin);
    const { status, body } = await api('GET', `/api/v1/churches/${church.id}/quarterly/2026/4`, admin);
    expect(status).toBe(200);
    expect(body.missingMonths).toEqual([12]);
    expect(body.totals.attendance).toBe(300);
    expect(body.totals.servicesHeld).toBe(9);
    expect(body.totals.fundsRaised).toBe(3000);
    // Unknown membership values are marked so the UI can show "Not entered".
    expect(body.auto.opening).toBeNull();
    expect(body.auto.openingSource).toBe('not_entered');
    expect(body.auto.closing).toBeNull();
  });

  it('numeric strings are summed like numbers', async () => {
    await putMonth(12, { attendance: '50', servicesHeld: 6, fundsRaised: 3000 });
    const { status, body } = await api('GET', `/api/v1/churches/${church.id}/quarterly/2026/4`, admin);
    expect(status).toBe(200);
    expect(body.totals.attendance).toBe(350); // 100 + 200 + "50"
    expect(body.missingMonths).toEqual([]);
  });

  it('submitting a blank report is rejected', async () => {
    const { status, body } = await api(
      'PUT',
      `/api/v1/churches/${church.id}/monthly-reports/2026/9`,
      admin,
      { data: {}, status: 'submitted' }
    );
    expect(status).toBe(400);
    expect(body.error.code).toBe('BLANK_SUBMISSION');
  });

  it('auto membership uses the profile opening plus deltas', async () => {
    await pool.query(`UPDATE churches SET profile = $1 WHERE id = $2`, [
      JSON.stringify({ opening_members_2026: 120 }),
      church.id,
    ]);
    await putMonth(10, {
      attendance: 100,
      accessions: 5,
      transfers_in: 2,
      transfers_out: 1,
      deaths: 1,
    });
    const { status, body } = await api('GET', `/api/v1/churches/${church.id}/quarterly/2026/4`, admin);
    expect(status).toBe(200);
    // 120 + 5 + 2 - 1 - 1 = 125
    expect(body.auto.opening).toBe(120);
    expect(body.auto.openingSource).toBe('profile');
    expect(body.auto.accessions).toBe(5);
    expect(body.auto.transfersIn).toBe(2);
    expect(body.auto.transfersOut).toBe(1);
    expect(body.auto.deaths).toBe(1);
    expect(body.auto.closing).toBe(125);
  });
});
