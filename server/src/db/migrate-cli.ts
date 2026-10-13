import dotenv from 'dotenv';
dotenv.config();

import { migrate } from './migrate.js';
import { pool } from './pool.js';
import { logger } from '../lib/logger.js';

migrate()
  .then(async () => {
    logger.info('Migrations complete.');
    await pool.end();
  })
  .catch(async (err) => {
    logger.error('Migration failed.', err);
    await pool.end();
    process.exit(1);
  });
