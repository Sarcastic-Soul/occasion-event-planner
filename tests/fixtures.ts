import type { EventInput } from "@/lib/plan/schema";

export const TODAY = "2026-10-21";

export function makeInput(overrides: Partial<EventInput> = {}): EventInput {
  return {
    eventType: "wedding",
    title: "",
    date: "2027-03-20",
    guests: 150,
    budget: 1_500_000,
    currency: "INR",
    setting: "indoor",
    considerations: [],
    notes: "",
    ...overrides,
  };
}
