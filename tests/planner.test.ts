import { describe, expect, test } from "bun:test";
import type { JsonGenerator } from "@/lib/ai/generator";
import { createPlan, refineInput } from "@/lib/ai/planner";
import { TODAY, makeInput } from "./fixtures";

const fake = (reply: string | Error): JsonGenerator & { calls: number } => ({
  calls: 0,
  async generate() {
    this.calls += 1;
    if (reply instanceof Error) throw reply;
    return reply;
  },
});

const enrichment = {
  summary: "A calm spring wedding.",
  ideas: [{ title: "Mango leaf toran", description: "Fresh entrance garland.", costHint: "low" }],
  extraTasks: [{ title: "Book mehendi artist", weeksBefore: 6 }],
  budgetTips: ["Ask for a weekday rate."],
};

describe("createPlan", () => {
  test("uses rules alone when no AI is configured", async () => {
    const plan = await createPlan(makeInput(), TODAY, null);
    expect(plan.ideasSource).toBe("rules");
    expect(plan.ideas.length).toBeGreaterThan(0);
  });

  test("merges AI ideas and tasks without changing the budget", async () => {
    const base = await createPlan(makeInput(), TODAY, null);
    const plan = await createPlan(makeInput(), TODAY, fake(JSON.stringify(enrichment)));
    expect(plan.ideasSource).toBe("ai");
    expect(plan.budget).toEqual(base.budget);
    expect(plan.timeline.find((t) => t.source === "ai")?.title).toBe("Book mehendi artist");
  });

  test("falls back to rules on bad JSON, wrong shape or errors", async () => {
    for (const reply of ["not json", JSON.stringify({ ideas: "nope" }), new Error("timeout")]) {
      const plan = await createPlan(makeInput(), TODAY, fake(reply));
      expect(plan.ideasSource).toBe("rules");
    }
  });
});

describe("refineInput", () => {
  test("turns the model's changes into a checked input", async () => {
    const ai = fake(
      JSON.stringify({
        reply: "Cut to 60 guests.",
        changes: { guests: 60, budget: null, date: null, setting: null, addConsiderations: [], notesToAdd: null },
      }),
    );
    const result = await refineInput(makeInput(), TODAY, "only 60 people", ai);
    expect(result.input.guests).toBe(60);
    expect(ai.calls).toBe(1);
  });
});
