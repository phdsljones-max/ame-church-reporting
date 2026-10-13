/**
 * Must be imported FIRST (before any server/src import) in test setup:
 * server/src/config.ts reads and requires these at module-evaluation time,
 * and ES imports are hoisted, so env defaults set later in the same file
 * would run too late. This module has no imports of its own, so its body
 * executes before anything it precedes in the import graph.
 */
process.env.JWT_ACCESS_SECRET ??= 'test-access-secret-not-for-production-use';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-not-for-production-use';
process.env.ACCESS_TOKEN_TTL ??= '15m';
process.env.REFRESH_TOKEN_TTL ??= '30d';
