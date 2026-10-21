const DAY_MS = 86_400_000;

/** Parses YYYY-MM-DD as a UTC calendar day so math never shifts with the server timezone. */
export function parseDay(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function formatDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((parseDay(toIso) - parseDay(fromIso)) / DAY_MS);
}

export function addDays(iso: string, days: number): string {
  return formatDay(parseDay(iso) + days * DAY_MS);
}

export function isRealDate(iso: string): boolean {
  return formatDay(parseDay(iso)) === iso;
}
