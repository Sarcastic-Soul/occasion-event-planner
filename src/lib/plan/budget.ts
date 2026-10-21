import { needsAccess, type Currency, type EventInput, type EventType } from "./schema";
import type { BudgetLine, BudgetPlan } from "./types";

interface Category {
  id: string;
  label: string;
  weight: number;
}

/** Typical split of spend (before the buffer) for each kind of event. Weights sum to 1. */
const BASE_SPLIT: Record<EventType, Category[]> = {
  wedding: [
    { id: "venue", label: "Venue", weight: 0.2 },
    { id: "catering", label: "Food & drinks", weight: 0.3 },
    { id: "decor", label: "Décor & flowers", weight: 0.15 },
    { id: "photo", label: "Photo & video", weight: 0.12 },
    { id: "attire", label: "Outfits & styling", weight: 0.1 },
    { id: "music", label: "Music & entertainment", weight: 0.07 },
    { id: "invites", label: "Invitations & favours", weight: 0.06 },
  ],
  birthday: [
    { id: "venue", label: "Venue", weight: 0.2 },
    { id: "catering", label: "Food & cake", weight: 0.35 },
    { id: "decor", label: "Décor & theme", weight: 0.15 },
    { id: "music", label: "Games & entertainment", weight: 0.18 },
    { id: "invites", label: "Invites & return gifts", weight: 0.12 },
  ],
  community: [
    { id: "venue", label: "Venue & permits", weight: 0.22 },
    { id: "catering", label: "Food & water", weight: 0.3 },
    { id: "av", label: "Sound, stage & lighting", weight: 0.18 },
    { id: "safety", label: "Safety, first aid & cleanup", weight: 0.12 },
    { id: "promo", label: "Posters & outreach", weight: 0.08 },
    { id: "decor", label: "Signage & décor", weight: 0.1 },
  ],
};

/** Below this spend per guest the plan is flagged as tight. Rough market floors. */
const PER_GUEST_FLOOR: Record<EventType, Record<Currency, number>> = {
  wedding: { INR: 2000, USD: 60, EUR: 55, GBP: 50 },
  birthday: { INR: 400, USD: 15, EUR: 14, GBP: 12 },
  community: { INR: 150, USD: 6, EUR: 5, GBP: 5 },
};

const RUSH_DAYS = 30;

function bufferShare(daysLeft: number): number {
  // Short notice means rush fees and fewer choices, so keep more in reserve.
  return daysLeft < RUSH_DAYS ? 0.15 : 0.1;
}

/** Applies the event's setting and needs to the base split, then renormalises. */
export function adjustSplit(input: EventInput): Category[] {
  let cats = BASE_SPLIT[input.eventType].map((c) => ({ ...c }));

  if (input.setting === "home") {
    cats = cats.map((c) =>
      c.id === "venue" ? { ...c, label: "Rentals (chairs, tables, tent)", weight: c.weight * 0.4 } : c,
    );
  }
  if (input.setting === "outdoor") {
    cats.push({ id: "weather", label: "Weather backup (canopy, fans)", weight: 0.06 });
  }
  if (needsAccess(input)) {
    cats.push({ id: "access", label: "Access (ramps, seating, transport)", weight: 0.04 });
  }

  const sum = cats.reduce((s, c) => s + c.weight, 0);
  return cats.map((c) => ({ ...c, weight: c.weight / sum }));
}

/** Picks a rounding step that reads naturally: whole thousands for big budgets, units for tiny ones. */
export function roundingStep(total: number): number {
  if (total >= 100_000) return 1000;
  if (total >= 10_000) return 100;
  if (total >= 1_000) return 10;
  return 1;
}

export function buildBudget(input: EventInput, daysLeft: number): BudgetPlan {
  const { budget: total, guests, currency, eventType } = input;
  const step = roundingStep(total);
  const reserve = bufferShare(daysLeft);
  const spendable = total * (1 - reserve);

  const amounts = adjustSplit(input).map((c) => ({
    id: c.id,
    label: c.label,
    amount: Math.floor((spendable * c.weight) / step) * step,
  }));

  // Whatever rounding left over goes to the buffer, so lines always add up to the total.
  const allocated = amounts.reduce((s, l) => s + l.amount, 0);
  amounts.push({ id: "buffer", label: `Buffer (${Math.round(reserve * 100)}%)`, amount: total - allocated });
  const lines: BudgetLine[] = amounts.map((l) => ({ ...l, share: l.amount / total }));

  const perGuest = Math.floor(total / guests);
  const floor = PER_GUEST_FLOOR[eventType][currency];
  const health = perGuest < floor ? "tight" : "comfortable";

  const warnings: string[] = [];
  if (health === "tight") {
    const fitGuests = Math.max(1, Math.floor(total / floor));
    warnings.push(
      `About ${perGuest} ${currency} per guest is tight for a ${eventType}. Either trim the list to around ${fitGuests} guests, or plan for a potluck, a weekday date or a simpler menu.`,
    );
  }
  if (daysLeft < RUSH_DAYS) {
    warnings.push("Under a month to go: vendors may add rush fees, so the buffer is raised to 15%.");
  }

  return { currency, total, perGuest, lines, health, warnings };
}
