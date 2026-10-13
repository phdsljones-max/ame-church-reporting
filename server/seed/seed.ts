/**
 * Sample-data seed for AME Monthly Church Reporting (Phase 1).
 *
 * Creates, idempotently:
 *   1. District  "Sample Episcopal District (SAMPLE)" — tier 'pilot',
 *      license expires 1 year from seeding, is_active = true.
 *   2. Church    "Sample AME Church (SAMPLE)" — is_sample = true.
 *   3. The 13 standard AME components for that district.
 *   4. ONE district_admin sample login — ONLY when the environment
 *      variables SEED_OWNER_EMAIL and SEED_OWNER_PASSWORD are both set.
 *      The password is hashed with bcrypt (cost 12); nothing is hardcoded.
 *
 * Every row is clearly sample-labeled (names carry "(SAMPLE)", the church
 * row has is_sample = true). This seed NEVER imports real-world data —
 * it only creates the fixed sample rows above.
 *
 * Safe to re-run: every insert is guarded by a select or ON CONFLICT, so
 * running it twice changes nothing.
 *
 * Usage:
 *   npm run seed
 *   SEED_OWNER_EMAIL=sample.admin@example.org SEED_OWNER_PASSWORD='long-secret' npm run seed
 *
 * In production the owner normally skips step 4 (leave the env vars empty)
 * and creates real accounts through POST /api/v1/users instead.
 */
import 'dotenv/config';

import bcrypt from 'bcryptjs';
import { pool } from '../src/db/pool.js';
import { migrate } from '../src/db/migrate.js';
import { STANDARD_COMPONENTS } from '../src/lib/standardComponents.js';
import { logger } from '../src/lib/logger.js';

// Bcrypt cost for the sample login hash. Matches config.bcryptCost; kept
// local so `npm run seed` needs no JWT secrets.
const BCRYPT_COST = 12;

const SAMPLE_DISTRICT_NAME = 'Sample Episcopal District (SAMPLE)';
const SAMPLE_CHURCH_NAME = 'Sample AME Church (SAMPLE)';

async function upsertSampleDistrict(): Promise<string> {
  const existing = await pool.query('SELECT id FROM districts WHERE name = $1', [
    SAMPLE_DISTRICT_NAME,
  ]);
  if (existing.rows.length) {
    logger.info(`Seed: district "${SAMPLE_DISTRICT_NAME}" already exists — skipping.`);
    return existing.rows[0].id as string;
  }
  const { rows } = await pool.query(
    `INSERT INTO districts (name, license_tier, license_expires_at, is_active)
     VALUES ($1, 'pilot', NOW() + INTERVAL '1 year', TRUE)
     RETURNING id`,
    [SAMPLE_DISTRICT_NAME]
  );
  logger.info(`Seed: created district "${SAMPLE_DISTRICT_NAME}".`);
  return rows[0].id as string;
}

async function upsertSampleChurch(districtId: string): Promise<string> {
  const existing = await pool.query(
    'SELECT id FROM churches WHERE district_id = $1 AND name = $2',
    [districtId, SAMPLE_CHURCH_NAME]
  );
  if (existing.rows.length) {
    logger.info(`Seed: church "${SAMPLE_CHURCH_NAME}" already exists — skipping.`);
    return existing.rows[0].id as string;
  }
  const { rows } = await pool.query(
    `INSERT INTO churches (district_id, name, city, state, profile, is_sample)
     VALUES ($1, $2, 'Sample City', 'ST', $3::jsonb, TRUE)
     RETURNING id`,
    [
      districtId,
      SAMPLE_CHURCH_NAME,
      JSON.stringify({ sample: true, note: 'Sample row created by npm run seed.' }),
    ]
  );
  logger.info(`Seed: created church "${SAMPLE_CHURCH_NAME}".`);
  return rows[0].id as string;
}

async function upsertStandardComponents(districtId: string): Promise<void> {
  let created = 0;
  for (let i = 0; i < STANDARD_COMPONENTS.length; i++) {
    const name = STANDARD_COMPONENTS[i];
    const res = await pool.query(
      `INSERT INTO components (district_id, name, sort_order)
       VALUES ($1, $2, $3)
       ON CONFLICT (district_id, name) DO NOTHING`,
      [districtId, name, i]
    );
    created += res.rowCount ?? 0;
  }
  logger.info(
    `Seed: standard components upserted (${created} new, ${
      STANDARD_COMPONENTS.length - created
    } already present).`
  );
}

/**
 * Create the single district_admin sample login, ONLY when the caller
 * explicitly provides SEED_OWNER_EMAIL and SEED_OWNER_PASSWORD. Never
 * hardcodes or invents credentials.
 */
async function maybeCreateSampleAdmin(districtId: string): Promise<void> {
  const email = (process.env.SEED_OWNER_EMAIL ?? '').trim().toLowerCase();
  const password = process.env.SEED_OWNER_PASSWORD ?? '';

  if (!email && !password) {
    logger.info('Seed: SEED_OWNER_EMAIL/SEED_OWNER_PASSWORD not set — no sample login created.');
    return;
  }
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    logger.warn('Seed: SEED_OWNER_EMAIL is missing or invalid — no sample login created.');
    return;
  }
  if (password.length < 8) {
    logger.warn('Seed: SEED_OWNER_PASSWORD must be at least 8 characters — no sample login created.');
    return;
  }

  const existing = await pool.query(
    'SELECT id FROM users WHERE district_id = $1 AND lower(email) = lower($2)',
    [districtId, email]
  );
  if (existing.rows.length) {
    logger.info(`Seed: sample login ${email} already exists — skipping.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  await pool.query(
    `INSERT INTO users (district_id, email, password_hash, role)
     VALUES ($1, $2, $3, 'district_admin')`,
    [districtId, email, passwordHash]
  );
  logger.info(`Seed: created SAMPLE district_admin login ${email}.`);
}

export async function seed(): Promise<void> {
  const districtId = await upsertSampleDistrict();
  await upsertSampleChurch(districtId);
  await upsertStandardComponents(districtId);
  await maybeCreateSampleAdmin(districtId);
  logger.info('Seed complete: all rows are sample-labeled; no real-world data was imported.');
}

async function main(): Promise<void> {
  try {
    await migrate();
    await seed();
  } finally {
    await pool.end().catch(() => undefined);
  }
}

// Run when executed directly: `tsx server/seed/seed.ts` (npm run seed).
if (require.main === module) {
  main().catch((err) => {
    logger.error('Seed failed.', err);
    process.exit(1);
  });
}
