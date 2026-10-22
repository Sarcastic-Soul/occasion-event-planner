import { LIMITS, type Consideration, type CostHint, type EventType, type Setting } from "./schema";

/** Display text for each choice, kept in one place so the form and the plan always agree. */
export const EVENT_LABELS: Record<EventType, string> = {
  wedding: "Wedding",
  birthday: "Birthday",
  community: "Community event",
};

/** Shorter names for the occasion buttons on the form. */
export const EVENT_CHOICE_LABELS: Record<EventType, string> = {
  wedding: "Wedding",
  birthday: "Birthday",
  community: "Community",
};

export const SETTING_LABELS: Record<Setting, string> = {
  indoor: "Indoor venue",
  outdoor: "Outdoor",
  home: "At home",
};

export const CONSIDERATION_LABELS: Record<Consideration, string> = {
  accessibility: "Wheelchair access",
  dietary: "Dietary needs",
  kids: "Lots of children",
  elderly: "Older guests",
  eco: "Low waste",
};

export const COST_LABELS: Record<CostHint, string> = {
  low: "Low cost",
  medium: "Medium cost",
  high: "Higher cost",
};

const numberFormat = new Intl.NumberFormat("en-US");

/** What each limited field accepts, worded for people. Used by the form and by plain-language changes. */
export const LIMIT_RULES = {
  guests: `between 1 and ${numberFormat.format(LIMITS.maxGuests)}`,
  budget: "a whole number above 0",
  title: `under ${LIMITS.titleLength} characters`,
  notes: `under ${LIMITS.notesLength} characters`,
} as const;
