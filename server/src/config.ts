function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name}. See .env.example.`);
  }
  return value;
}

/** Parse TTL strings like "15m", "30d", "12h", "60s" into milliseconds. */
export function parseTtlToMs(ttl: string): number {
  const match = /^(\d+)\s*([smhd])$/i.exec(ttl.trim());
  if (!match) {
    throw new Error(
      `Invalid TTL "${ttl}". Use a number followed by s, m, h, or d (for example "15m").`
    );
  }
  const n = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return n * multipliers[unit];
}

/** TTL strings like "15m", "30d", "12h", "60s". */
export type TtlString = `${number}${'s' | 'm' | 'h' | 'd'}`;

function asTtl(value: string | undefined, fallback: TtlString): TtlString {
  const v = (value ?? fallback).trim();
  parseTtlToMs(v); // throws on invalid format, so misconfiguration fails fast
  return v as TtlString;
}

const accessTokenTtl = asTtl(process.env.ACCESS_TOKEN_TTL, '15m');
const refreshTokenTtl = asTtl(process.env.REFRESH_TOKEN_TTL, '30d');

export const config = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl:
    process.env.DATABASE_URL ??
    'postgresql://amereports:amereports@localhost:5432/amereports',
  jwtAccessSecret: required('JWT_ACCESS_SECRET'),
  jwtRefreshSecret: required('JWT_REFRESH_SECRET'),
  accessTokenTtl,
  refreshTokenTtl,
  accessTokenTtlMs: parseTtlToMs(accessTokenTtl),
  refreshTokenTtlMs: parseTtlToMs(refreshTokenTtl),
  webOrigin: process.env.WEB_ORIGIN ?? 'http://localhost:5173',
  mailer: (process.env.MAILER ?? 'stub').toLowerCase(),
  seedOnBoot: (process.env.SEED ?? 'false').toLowerCase() === 'true',
  bcryptCost: 12,
};
