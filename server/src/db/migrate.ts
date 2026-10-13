import fs from 'node:fs';
import path from 'node:path';
import { pool } from './pool.js';
import { logger } from '../lib/logger.js';

/** Run pending SQL migrations in filename order, tracked in schema_migrations. */
export async function migrate(): Promise<void> {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
       filename   TEXT PRIMARY KEY,
       applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`
  );

  const dir = path.join(__dirname, 'migrations');
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  const applied = new Set(
    (await pool.query('SELECT filename FROM schema_migrations')).rows.map(
      (r: { filename: string }) => r.filename
    )
  );

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    logger.info(`Applying migration ${file}`);
    await pool.query('BEGIN');
    try {
      await pool.query(sql);
      await pool.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
      await pool.query('COMMIT');
      logger.info(`Migration ${file} applied`);
    } catch (err) {
      await pool.query('ROLLBACK');
      throw err;
    }
  }
}
