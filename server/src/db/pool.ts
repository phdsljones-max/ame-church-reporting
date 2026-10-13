import { Pool } from 'pg';

// The connection string is read straight from the environment (not via
// config.ts) so database tooling — migrate, seed — only ever needs
// DATABASE_URL and never the JWT secrets. Same default as config.databaseUrl.
export const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    'postgresql://amereports:amereports@localhost:5432/amereports',
  max: 20,
});
