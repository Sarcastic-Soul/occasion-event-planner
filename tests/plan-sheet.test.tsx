import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PlanSheet } from "@/components/planner/PlanSheet";
import { buildBasePlan, mergeEnrichment } from "@/lib/plan/build-plan";
import type { EventPlan } from "@/lib/plan/types";
import { TODAY, makeInput } from "./fixtures";

afterEach(cleanup);

const aiPlan = mergeEnrichment(
  buildBasePlan(makeInput({ title: "Asha & Rohan", date: "2026-12-20" }), TODAY),
  {
    summary: "A December wedding.",
    ideas: [{ title: "Lantern path", description: "Light the walkway.", costHint: "low" }],
    extraTasks: [{ title: "Book rooms for family", weeksBefore: 6 }],
    budgetTips: ["Buy flowers in season."],
  },
  TODAY,
);

function renderSheet(plan: EventPlan = aiPlan, stale = false) {
  const props = { isDone: (id: string) => id === "vendor/venue", onToggle: mock(), onRefine: mock(async () => "") };
  render(<PlanSheet plan={plan} stale={stale} {...props} />);
  return props;
}

describe("PlanSheet", () => {
  test("shows every part of the plan under its own heading", () => {
    renderSheet();
    expect(screen.getByRole("heading", { level: 2 }).textContent).toContain("Asha & Rohan");
    for (const name of ["Budget split", "Do this week", "Then", "Vendor checklist", "Ideas"]) {
      expect(screen.getByRole("heading", { name: new RegExp(name) })).toBeTruthy();
    }
    expect(screen.getByText("Made for this event by Gemini")).toBeTruthy();
    expect(screen.getByRole("table", { name: "Budget by category" })).toBeTruthy();
  });

  test("marks late tasks and Gemini's tasks", () => {
    renderSheet();
    expect(screen.getAllByText("Now, late").length).toBeGreaterThan(0);
    expect(screen.getByText("for you")).toBeTruthy();
  });

  test("vendors can be ticked off like tasks", () => {
    const { onToggle } = renderSheet();
    const venue = screen.getByRole("checkbox", { name: "Venue" }) as HTMLInputElement;
    expect(venue.checked).toBe(true);
    fireEvent.click(screen.getByRole("checkbox", { name: "Caterer" }));
    expect(onToggle).toHaveBeenCalledWith("vendor/caterer");
  });

  test("an out-of-date plan says so and hides Gemini's extras", () => {
    renderSheet(aiPlan, true);
    expect(screen.getByText(/Details changed/).closest("[role=status]")).toBeTruthy();
    expect(screen.getByText("Starter ideas")).toBeTruthy();
    expect(screen.queryByText("Buy flowers in season.")).toBeNull();
  });
});
