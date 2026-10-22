import type { Currency } from "../plan/schema";
import { parseDay } from "../plan/dates";

const LOCALE: Record<Currency, string> = { INR: "en-IN", USD: "en-US", EUR: "en-IE", GBP: "en-GB" };

const moneyFormats = new Map<Currency, Intl.NumberFormat>();

export function formatMoney(amount: number, currency: Currency): string {
  let format = moneyFormats.get(currency);
  if (!format) {
    format = new Intl.NumberFormat(LOCALE[currency], { style: "currency", currency, maximumFractionDigits: 0 });
    moneyFormats.set(currency, format);
  }
  return format.format(amount);
}

const dayFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function formatDate(iso: string): string {
  return dayFormat.format(parseDay(iso));
}

export function localToday(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
