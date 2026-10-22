const DAY_MS = 86_400_000;

/** Parses YYYY-MM-DD as a UTC calendar day so math never shifts with the server timezone. */
export function parseDay(iso: string): number {
  const [y = Number.NaN, m = Number.NaN, d = Number.NaN] = iso.split("-").map(Number);
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

/**
 * The date to act by for something needed `weeksBefore` the event.
 * When that date has passed it becomes today, flagged as late.
 */
export function leadDate(eventDate: string, weeksBefore: number, today: string): { date: string; late: boolean } {
  const leadDays = weeksBefore * 7;
  if (leadDays > daysBetween(today, eventDate)) return { date: today, late: true };
  return { date: addDays(eventDate, -leadDays), late: false };
}

export function isRealDate(iso: string): boolean {
  return formatDay(parseDay(iso)) === iso;
}
