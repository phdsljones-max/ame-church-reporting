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

describe('license gating', () => {
  const s = rnd();
  let expiredDistrict: any;
  let inactiveDistrict: any;
  let expiredChurch: any;
  let expiredAdmin = '';
  let inactiveAdmin = '';

  beforeAll(async () => {
    expiredDistrict = await createDistrict(`License Expired ${s}`, {
      expiresAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    });
    inactiveDistrict = await createDistrict(`License Inactive ${s}`, { isActive: false });
    expiredChurch = await createChurch(expiredDistrict.id, `License Church ${s}`);

    await createUser(expiredDistrict.id, `lic-exp-${s}@test.local`, 'district_admin');
    await createUser(inactiveDistrict.id, `lic-inact-${s}@test.local`, 'district_admin');
    expiredAdmin = (await login(`lic-exp-${s}@test.local`)).accessToken;
    inactiveAdmin = (await login(`lic-inact-${s}@test.local`)).accessToken;
  });

  afterAll(async () => {
    await deleteDistrict(expiredDistrict.id);
    await deleteDistrict(inactiveDistrict.id);
  });

  it('expired license: GET still works (200)', async () => {
    const { status } = await api('GET', '/api/v1/churches', expiredAdmin);
    expect(status).toBe(200);
  });

  it('expired license: PUT is rejected with LICENSE_INACTIVE', async () => {
    const { status, body } = await api(
      'PUT',
      `/api/v1/churches/${expiredChurch.id}/monthly-reports/2026/10`,
      expiredAdmin,
      { data: { attendance: 10 }, status: 'draft' }
    );
    expect(status).toBe(403);
    expect(body.error.code).toBe('LICENSE_INACTIVE');
    expect(body.error.message).toContain('Phoenix Rising AI Solutions');
  });

  it('deactivated district: GET works, POST is rejected', async () => {
    const getRes = await api('GET', '/api/v1/churches', inactiveAdmin);
    expect(getRes.status).toBe(200);

    const postRes = await api('POST', '/api/v1/churches', inactiveAdmin, {
      name: `Should Not Exist ${s}`,
    });
    expect(postRes.status).toBe(403);
    expect(postRes.body.error.code).toBe('LICENSE_INACTIVE');
  });

  it('exports stay available when the license is expired', async () => {
    const { status, body } = await api(
      'GET',
      `/api/v1/exports/quarterly/${expiredChurch.id}/2026/4`,
      expiredAdmin
    );
    expect(status).toBe(200);
    expect(String(body)).toContain('Phoenix Rising AI Solutions');
  });
});
