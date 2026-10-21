import { buildBudget } from "./budget";
import { daysBetween } from "./dates";
import { FALLBACK_IDEAS } from "./fallback-ideas";
import type { AiEnrichment, EventInput } from "./schema";
import { buildTimeline, scheduleTask, sortByDue } from "./timeline";
import type { EventPlan } from "./types";
import { buildVendors } from "./vendors";

/**
 * Builds the plan from rules alone. Every number here is computed, not generated,
 * so the budget always adds up and dates always count back from the event.
 */
export function buildBasePlan(input: EventInput, today: string): EventPlan {
  const daysLeft = daysBetween(today, input.date);
  return {
    input,
    daysLeft,
    budget: buildBudget(input, daysLeft),
    timeline: buildTimeline(input, today),
    vendors: buildVendors(input, today),
    ideas: FALLBACK_IDEAS[input.eventType],
    summary: "",
    budgetTips: [],
    ideasSource: "rules",
  };
}

/** Layers Gemini's personal touches on top of the rule-based plan without touching the numbers. */
export function mergeEnrichment(plan: EventPlan, ai: AiEnrichment, today: string): EventPlan {
  const extra = ai.extraTasks.map((t, i) =>
    scheduleTask({ id: `ai-${i}`, title: t.title, weeksBefore: t.weeksBefore, source: "ai" }, plan.input.date, today),
  );
  return {
    ...plan,
    timeline: sortByDue([...plan.timeline, ...extra]),
    ideas: ai.ideas,
    summary: ai.summary,
    budgetTips: ai.budgetTips,
    ideasSource: "ai",
  };
}
