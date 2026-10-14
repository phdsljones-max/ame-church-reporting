/**
 * Production bootstrap — run ONCE per fresh database (e.g. as a Render job):
 *
 *   OWNER_EMAIL=you@example.org OWNER_PASSWORD='long-secret' \
 *   DISTRICT_NAME='My District' npm run bootstrap:owner
 *
 * Creates the district (pilot license, 1 year), the 13 standard AME
 * components, and the owner login. Everything else (district admins,
 * church editors, component leaders) is created by the owner through
 * POST /api/v1/users — there is no public signup.
 *
 * Safe to re-run: skips when the owner email already exists.
 * Mirrors server/seed/seed.ts conventions; the password is hashed with
 * bcrypt (cost 12) and never logged.
 */
import 'dotenv/config';

import bcrypt from 'bcryptjs';
import { pool } from '../src/db/pool.js';
import { migrate } from '../src/db/migrate.js';
import { STANDARD_COMPONENTS } from '../src/lib/standardComponents.js';
import { logger } from '../src/lib/logger.js';

// local so the bootstrap needs no JWT secrets.
const BCRYPT_COST = 12;

async function main(): Promise<void> {
  const email = (process.env.OWNER_EMAIL ?? '').trim().toLowerCase();
  const password = process.env.OWNER_PASSWORD ?? '';
  const districtName = (process.env.DISTRICT_NAME ?? '').trim();

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    throw new Error('OWNER_EMAIL is missing or invalid.');
  }
  if (password.length < 12) {
    throw new Error('OWNER_PASSWORD must be at least 12 characters.');
  }
  if (!districtName) {
    throw new Error('DISTRICT_NAME is missing.');
  }

  await migrate();

  const existingUser = await pool.query(
    'SELECT id FROM users WHERE lower(email) = lower($1)',
    [email]
  );
  if (existingUser.rows.length) {
    logger.info(`Bootstrap: owner ${email} already exists — nothing to do.`);
    return;
  }

  let districtId: string;
  const existingDistrict = await pool.query(
    'SELECT id FROM districts WHERE name = $1',
    [districtName]
  );
  if (existingDistrict.rows.length) {
    districtId = existingDistrict.rows[0].id as string;
    logger.info(`Bootstrap: district "${districtName}" already exists — reusing.`);
  } else {
    const { rows } = await pool.query(
      `INSERT INTO districts (name, license_tier, license_expires_at, is_active)
       VALUES ($1, 'pilot', NOW() + INTERVAL '1 year', TRUE)
       RETURNING id`,
      [districtName]
    );
    districtId = rows[0].id as string;
    logger.info(`Bootstrap: created district "${districtName}" (pilot, 1 year).`);
  }

  for (let i = 0; i < STANDARD_COMPONENTS.length; i++) {
    await pool.query(
      `INSERT INTO components (district_id, name, sort_order)
       VALUES ($1, $2, $3)
       ON CONFLICT (district_id, name) DO NOTHING`,
      [districtId, STANDARD_COMPONENTS[i], i]
    );
  }
  logger.info('Bootstrap: 13 standard components ready.');

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  await pool.query(
    `INSERT INTO users (district_id, email, password_hash, role)
     VALUES ($1, $2, $3, 'owner')`,
    [districtId, email, passwordHash]
  );
  logger.info(`Bootstrap: owner login ${email} created.`);
}

main()
  .catch((err) => {
    logger.error('Bootstrap failed.', err);
    process.exit(1);
  })
  .finally(() => pool.end().catch(() => undefined));
