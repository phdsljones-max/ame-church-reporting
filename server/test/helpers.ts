import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import bcrypt from 'bcryptjs';
import { createApp } from '../src/app.js';
import { pool } from '../src/db/pool.js';

let server: Server | null = null;
let baseUrl = '';

export async function startServer(): Promise<string> {
  if (baseUrl) return baseUrl;
  const app = createApp();
  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => resolve());
  });
  const addr = server!.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${addr.port}`;
  return baseUrl;
}

export async function stopServer(): Promise<void> {
  if (server) {
    await new Promise<void>((resolve, reject) =>
      server!.close((err) => (err ? reject(err) : resolve()))
    );
    server = null;
    baseUrl = '';
  }
  await pool.end();
}

export interface ApiResult {
  status: number;
  body: any;
}

export async function api(
  method: string,
  path: string,
  token?: string,
  body?: unknown
): Promise<ApiResult> {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let parsed: any = null;
  const text = await res.text();
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  return { status: res.status, body: parsed };
}

export const rnd = (): string => Math.random().toString(36).slice(2, 10);

export async function createDistrict(
  name: string,
  license?: { tier?: string; expiresAt?: string | null; isActive?: boolean }
): Promise<any> {
  const { rows } = await pool.query(
    'INSERT INTO districts (name, license_tier, license_expires_at, is_active) VALUES ($1, $2, $3, $4) RETURNING *',
    [
      name,
      license?.tier ?? 'standard',
      license?.expiresAt === undefined
        ? new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString()
        : license.expiresAt,
      license?.isActive ?? true,
    ]
  );
  return rows[0];
}

export async function createUser(
  districtId: string,
  email: string,
  role: string,
  opts: { password?: string; churchId?: string | null; componentId?: string | null } = {}
): Promise<any> {
  const hash = await bcrypt.hash(opts.password ?? 'Password123!', 12);
  const { rows } = await pool.query(
    `INSERT INTO users (district_id, email, password_hash, role, church_id, component_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, district_id, email, role, church_id, component_id`,
    [districtId, email, hash, role, opts.churchId ?? null, opts.componentId ?? null]
  );
  return rows[0];
}

export async function login(
  email: string,
  password = 'Password123!'
): Promise<{ accessToken: string; refreshToken: string; user: any }> {
  const { status, body } = await api('POST', '/api/v1/auth/login', undefined, { email, password });
  if (status !== 200) {
    throw new Error(`login failed for ${email}: ${status} ${JSON.stringify(body)}`);
  }
  return body;
}

export async function createChurch(districtId: string, name: string): Promise<any> {
  const { rows } = await pool.query(
    'INSERT INTO churches (district_id, name) VALUES ($1, $2) RETURNING *',
    [districtId, name]
  );
  return rows[0];
}

export async function createComponent(districtId: string, name: string): Promise<any> {
  const { rows } = await pool.query(
    'INSERT INTO components (district_id, name) VALUES ($1, $2) RETURNING *',
    [districtId, name]
  );
  return rows[0];
}

export async function deleteDistrict(districtId: string): Promise<void> {
  await pool.query('DELETE FROM districts WHERE id = $1', [districtId]);
}
