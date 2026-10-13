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

describe('annual setup (theme / scripture / goals)', () => {
  const s = rnd();
  let district: any;
  let church: any;
  let otherChurch: any;
  let component: any;
  let admin = '';
  let editor = '';
  let otherEditor = '';
  let leader = '';

  beforeAll(async () => {
    district = await createDistrict(`Setup District ${s}`);
    church = await createChurch(district.id, `Setup Church ${s}`);
    otherChurch = await createChurch(district.id, `Setup Other Church ${s}`);
    component = await createComponent(district.id, `Setup Component ${s}`);

    await createUser(district.id, `setup-admin-${s}@test.local`, 'district_admin');
    await createUser(district.id, `setup-editor-${s}@test.local`, 'church_editor', {
      churchId: church.id,
    });
    await createUser(district.id, `setup-editor2-${s}@test.local`, 'church_editor', {
      churchId: otherChurch.id,
    });
    await createUser(district.id, `setup-leader-${s}@test.local`, 'component_leader', {
      componentId: component.id,
      churchId: church.id,
    });

    admin = (await login(`setup-admin-${s}@test.local`)).accessToken;
    editor = (await login(`setup-editor-${s}@test.local`)).accessToken;
    otherEditor = (await login(`setup-editor2-${s}@test.local`)).accessToken;
    leader = (await login(`setup-leader-${s}@test.local`)).accessToken;
  });

  afterAll(async () => {
    await deleteDistrict(district.id);
  });

  it('GET returns blank defaults when nothing is saved (never pre-filled)', async () => {
    const { status, body } = await api(
      'GET',
      `/api/v1/churches/${church.id}/annual-setup/2026`,
      editor
    );
    expect(status).toBe(200);
    expect(body.theme).toBe('');
    expect(body.scripture).toBe('');
    expect(body.goals).toEqual([]);
  });

  it('PUT upserts the church setup and GET returns it', async () => {
    const payload = {
      theme: 'Rooted and Rising',
      scripture: 'Jeremiah 17:8',
      goals: [
        { text: 'Grow Bible study attendance', target: '50 people', progress: 10, status: 'in_progress' },
        { text: 'Launch food pantry', status: 'not_started' },
      ],
    };
    const put = await api('PUT', `/api/v1/churches/${church.id}/annual-setup/2026`, editor, payload);
    expect(put.status).toBe(200);
    expect(put.body.theme).toBe('Rooted and Rising');
    expect(put.body.scripture).toBe('Jeremiah 17:8');
    expect(put.body.goals).toHaveLength(2);
    expect(put.body.goals[0].id).toBeTruthy();
    expect(put.body.goals[0].status).toBe('in_progress');
    expect(put.body.goals[1].progress).toBe(0);

    const get = await api('GET', `/api/v1/churches/${church.id}/annual-setup/2026`, editor);
    expect(get.status).toBe(200);
    expect(get.body.theme).toBe('Rooted and Rising');
  });

  it('PUT rejects an invalid goal status', async () => {
    const { status, body } = await api(
      'PUT',
      `/api/v1/churches/${church.id}/annual-setup/2026`,
      editor,
      { theme: 'x', goals: [{ text: 'y', status: 'almost' }] }
    );
    expect(status).toBe(400);
    expect(body.error.code).toBe('INVALID_GOALS');
  });

  it("a church_editor cannot touch another church's setup", async () => {
    const { status } = await api(
      'GET',
      `/api/v1/churches/${church.id}/annual-setup/2026`,
      otherEditor
    );
    expect(status).toBe(403);
  });

  it('component leader upserts their own component setup via query params', async () => {
    const path =
      `/api/v1/component-annual-setup?componentId=${component.id}` +
      `&churchId=${church.id}&level=church&year=2026`;
    const blank = await api('GET', path, leader);
    expect(blank.status).toBe(200);
    expect(blank.body.goals).toEqual([]);

    const put = await api('PUT', path, leader, {
      theme: 'Serve with Joy',
      scripture: 'Galatians 5:13',
      goals: [{ text: 'Visit 20 shut-ins', target: '20', progress: 0, status: 'not_started' }],
    });
    expect(put.status).toBe(200);
    expect(put.body.theme).toBe('Serve with Joy');
    expect(put.body.goals[0].text).toBe('Visit 20 shut-ins');

    const get = await api('GET', path, leader);
    expect(get.body.theme).toBe('Serve with Joy');
  });

  it('district_admin can manage component setups', async () => {
    const path =
      `/api/v1/component-annual-setup?componentId=${component.id}` +
      `&level=district&year=2026`;
    const put = await api('PUT', path, admin, { theme: 'District Theme' });
    expect(put.status).toBe(200);
    expect(put.body.churchId).toBeNull();
    expect(put.body.level).toBe('district');
  });
});
