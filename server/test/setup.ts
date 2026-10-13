import './test-env.js';
import './test-env.js';
import { beforeAll, afterAll } from 'vitest';
import { migrate } from '../src/db/migrate.js';
import { startServer, stopServer } from './helpers.js';

/**
 * Test setup: run migrations against DATABASE_URL, then boot the API
 * on an ephemeral port. Point DATABASE_URL at an empty test database, e.g.
 *   DATABASE_URL=postgresql://amereports:amereports@localhost:5432/amereports_test
 */
beforeAll(async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be set to run the API tests.');
  }
  await migrate();
  await startServer();
}, 60000);

afterAll(async () => {
  await stopServer();
}, 30000);
