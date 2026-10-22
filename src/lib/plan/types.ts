import type { CostHint, Currency, EventInput } from "./schema";

export interface BudgetLine {
  id: string;
  label: string;
  amount: number;
  share: number;
}

export interface BudgetPlan {
  currency: Currency;
  total: number;
  perGuest: number;
  lines: BudgetLine[];
  /** "tight" when spend per guest is under a sensible floor for this kind of event. */
  health: "comfortable" | "tight";
  warnings: string[];
}

export type TaskStatus = "upcoming" | "due-now" | "rushed";

export interface TimelineTask {
  id: string;
  title: string;
  dueDate: string;
  status: TaskStatus;
  /** Shown when the ideal lead time has passed and a faster option is needed. */
  fallback?: string;
  source: "rules" | "ai";
}

export interface VendorItem {
  id: string;
  name: string;
  why: string;
  bookBy: string;
  /** The ideal booking date has passed, so book today. */
  late: boolean;
  tip?: string;
}

export interface Idea {
  title: string;
  description: string;
  costHint: CostHint;
}

export interface EventPlan {
  input: EventInput;
  daysLeft: number;
  budget: BudgetPlan;
  timeline: TimelineTask[];
  vendors: VendorItem[];
  ideas: Idea[];
  summary: string;
  budgetTips: string[];
  /** Whether ideas and summary came from Gemini or from the built-in library. */
  ideasSource: "ai" | "rules";
}

/** The outcome of a plain-language change: the checked input and what to tell the user. */
export interface RefineResult {
  input: EventInput;
  reply: string;
  changed: boolean;
}
