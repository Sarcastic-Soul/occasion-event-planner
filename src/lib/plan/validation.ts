import { daysBetween, isRealDate } from "./dates";

const MAX_DAYS_AHEAD = 3 * 366;
/** Allows for the user's timezone being a day ahead of or behind the server. */
const TODAY_TOLERANCE_DAYS = 1;

/** Returns a readable problem with the event date, or null when it is fine. */
export function checkEventDate(date: string, today: string): string | null {
  if (!isRealDate(date)) return "not a real calendar date";
  const days = daysBetween(today, date);
  if (days < 0) return "already in the past";
  if (days > MAX_DAYS_AHEAD) return "more than 3 years away";
  return null;
}

/** Checks the client's "today" is close to the server's, so countdowns cannot be skewed. */
export function checkClientToday(clientToday: string, serverNow = new Date()): boolean {
  if (!isRealDate(clientToday)) return false;
  const serverToday = serverNow.toISOString().slice(0, 10);
  return Math.abs(daysBetween(serverToday, clientToday)) <= TODAY_TOLERANCE_DAYS;
}
