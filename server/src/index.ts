import dotenv from 'dotenv';
dotenv.config();

import { config } from './config.js';
import { pool } from './db/pool.js';
import { migrate } from './db/migrate.js';
import { seed } from '../seed/seed.js';
import { createApp } from './app.js';
import { logger } from './lib/logger.js';

async function main(): Promise<void> {
  await migrate();
  if (config.seedOnBoot) {
    await seed();
  }
  const app = createApp();
  app.listen(config.port, () => {
    logger.info(`AME reporting API listening on port ${config.port}`);
  });
}

main().catch(async (err) => {
  logger.error('Startup failed.', err);
  await pool.end().catch(() => undefined);
  process.exit(1);
});
