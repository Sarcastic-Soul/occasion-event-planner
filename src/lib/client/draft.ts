import { addDays } from "../plan/dates";
import { eventInputSchema, type Consideration, type Currency, type EventInput, type EventType, type Setting } from "../plan/schema";
import { checkEventDate } from "../plan/validation";

/** Form state. Number fields stay as text so a half-typed value is not lost. */
export interface Draft {
  eventType: EventType;
  title: string;
  date: string;
  guests: string;
  budget: string;
  currency: Currency;
  setting: Setting;
  considerations: Consideration[];
  notes: string;
}

export type DraftErrors = Partial<Record<keyof Draft, string>>;

const DEFAULTS: Record<EventType, Pick<Draft, "guests" | "budget" | "setting">> = {
  wedding: { guests: "150", budget: "1500000", setting: "indoor" },
  birthday: { guests: "25", budget: "40000", setting: "home" },
  community: { guests: "300", budget: "75000", setting: "outdoor" },
};

const LEAD_DAYS: Record<EventType, number> = { wedding: 150, birthday: 30, community: 60 };

export function defaultDraft(today: string, eventType: EventType = "wedding"): Draft {
  return {
    eventType,
    title: "",
    date: addDays(today, LEAD_DAYS[eventType]),
    ...DEFAULTS[eventType],
    currency: "INR",
    considerations: [],
    notes: "",
  };
}

export function draftFromInput(input: EventInput): Draft {
  return { ...input, guests: String(input.guests), budget: String(input.budget) };
}

/** Strips grouping separators like "15,00,000" or "1 500" before parsing. */
function toWholeNumber(text: string): number {
  const cleaned = text.replace(/[\s,_]/g, "");
  return /^\d+$/.test(cleaned) ? Number(cleaned) : Number.NaN;
}

const MESSAGES: Partial<Record<keyof Draft, string>> = {
  guests: "Enter a guest count between 1 and 5,000.",
  budget: "Enter a budget as a whole number above 0.",
  title: "Keep the name under 80 characters.",
  notes: "Keep notes under 500 characters.",
};

export function validateDraft(
  draft: Draft,
  today: string,
): { ok: true; input: EventInput } | { ok: false; errors: DraftErrors } {
  const result = eventInputSchema.safeParse({
    ...draft,
    guests: toWholeNumber(draft.guests),
    budget: toWholeNumber(draft.budget),
  });
  const errors: DraftErrors = {};
  if (!result.success) {
    for (const issue of result.error.issues) {
      const field = issue.path[0] as keyof Draft;
      errors[field] ??= MESSAGES[field] ?? issue.message;
    }
  }
  const dateProblem = checkEventDate(draft.date, today);
  if (dateProblem) errors.date = `Pick a date that is not ${dateProblem}.`;

  return result.success && !dateProblem ? { ok: true, input: result.data } : { ok: false, errors };
}
