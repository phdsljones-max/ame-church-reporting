import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  api,
  createChurch,
  createComponent,
  createDistrict,
  createUser,
  deleteDistrict,
  login,
  rnd,
} from './helpers.js';

describe('authorization scoping', () => {
  const s = rnd();
  let districtA: any;
  let districtB: any;
  let churchA: any;
  let churchB: any;
  let comp1: any;
  let comp2: any;
  let adminA = '';
  let leaderA = '';
  let elderA = '';

  beforeAll(async () => {
    districtA = await createDistrict(`Scope District A ${s}`);
    districtB = await createDistrict(`Scope District B ${s}`);
    churchA = await createChurch(districtA.id, `Scope Church A ${s}`);
    churchB = await createChurch(districtB.id, `Scope Church B ${s}`);
    comp1 = await createComponent(districtA.id, `Scope Comp 1 ${s}`);
    comp2 = await createComponent(districtA.id, `Scope Comp 2 ${s}`);

    await createUser(districtA.id, `admin-a-${s}@test.local`, 'district_admin');
    await createUser(districtA.id, `leader-a-${s}@test.local`, 'component_leader', {
      componentId: comp1.id,
      churchId: churchA.id,
    });
    await createUser(districtA.id, `elder-a-${s}@test.local`, 'presiding_elder');

    adminA = (await login(`admin-a-${s}@test.local`)).accessToken;
    leaderA = (await login(`leader-a-${s}@test.local`)).accessToken;
    elderA = (await login(`elder-a-${s}@test.local`)).accessToken;
  });

  afterAll(async () => {
    await deleteDistrict(districtA.id);
    await deleteDistrict(districtB.id);
  });

  it('a district-A user only sees district-A churches', async () => {
    const { status, body } = await api('GET', '/api/v1/churches', adminA);
    expect(status).toBe(200);
    const ids = (body.items as any[]).map((c) => c.id);
    expect(ids).toContain(churchA.id);
    expect(ids).not.toContain(churchB.id);
  });

  it('a district-A user gets 404 on a district-B church (no existence leak)', async () => {
    const { status, body } = await api('GET', `/api/v1/churches/${churchB.id}`, adminA);
    expect(status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('a district-A user gets 404 reading a district-B church\'s reports', async () => {
    const { status, body } = await api(
      'GET',
      `/api/v1/churches/${churchB.id}/monthly-reports?year=2026`,
      adminA
    );
    expect(status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('a component_leader cannot write another component\'s report', async () => {
    const { status, body } = await api('PUT', '/api/v1/component-reports', leaderA, {
      componentId: comp2.id,
      churchId: churchA.id,
      level: 'church',
      year: 2026,
      quarter: 4,
      data: { attendance: 50 },
      status: 'draft',
    });
    expect(status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('a component_leader can upsert their own component\'s report', async () => {
    const { status, body } = await api('PUT', '/api/v1/component-reports', leaderA, {
      componentId: comp1.id,
      churchId: churchA.id,
      level: 'church',
      year: 2026,
      quarter: 4,
      data: { attendance: 50 },
      status: 'draft',
    });
    expect(status).toBe(200);
    expect(body.componentId).toBe(comp1.id);
    expect(body.data.attendance).toBe(50);
  });

  it('a presiding_elder POST is rejected with 403 (read-only role)', async () => {
    const { status, body } = await api(
      'PUT',
      `/api/v1/churches/${churchA.id}/monthly-reports/2026/10`,
      elderA,
      { data: { attendance: 100 }, status: 'draft' }
    );
    expect(status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('a presiding_elder cannot create a church (POST -> 403)', async () => {
    const { status, body } = await api('POST', '/api/v1/churches', elderA, {
      name: `Elder Church ${s}`,
    });
    expect(status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('a presiding_elder can read within the district', async () => {
    const { status } = await api('GET', '/api/v1/churches', elderA);
    expect(status).toBe(200);
  });

  it('unauthenticated requests get 401', async () => {
    const { status, body } = await api('GET', '/api/v1/churches');
    expect(status).toBe(401);
    expect(body.error.code).toBe('UNAUTHENTICATED');
  });
});
