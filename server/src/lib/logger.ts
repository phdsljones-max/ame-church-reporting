/** Tiny logger used by routes and services. No console.log calls in routes. */
type LogArgs = unknown[];

function stamp(): string {
  return new Date().toISOString();
}

export const logger = {
  info(...args: LogArgs): void {
    console.log(`[info] ${stamp()}`, ...args);
  },
  warn(...args: LogArgs): void {
    console.warn(`[warn] ${stamp()}`, ...args);
  },
  error(...args: LogArgs): void {
    console.error(`[error] ${stamp()}`, ...args);
  },
};
