import { describe, expect, test } from "bun:test";
import { adjustSplit, buildBudget } from "@/lib/plan/budget";
import { makeInput } from "./fixtures";

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

describe("buildBudget", () => {
  test("lines always add up to the exact total", () => {
    for (const budget of [999, 12_345, 1_500_000, 7_777_777]) {
      const plan = buildBudget(makeInput({ budget }), 120);
      expect(sum(plan.lines.map((l) => l.amount))).toBe(budget);
    }
  });

  test("keeps a 10% buffer normally and 15% under a month", () => {
    const relaxed = buildBudget(makeInput({ budget: 100_000 }), 90);
    const rushed = buildBudget(makeInput({ budget: 100_000 }), 10);
    expect(relaxed.lines.find((l) => l.id === "buffer")!.amount).toBeGreaterThanOrEqual(10_000);
    expect(rushed.lines.find((l) => l.id === "buffer")!.amount).toBeGreaterThanOrEqual(15_000);
    expect(rushed.warnings.some((w) => w.includes("rush"))).toBe(true);
  });

  test("flags a tight budget and suggests a guest count that fits", () => {
    const plan = buildBudget(makeInput({ budget: 100_000, guests: 200 }), 120);
    expect(plan.health).toBe("tight");
    expect(plan.warnings[0]).toContain("around 50 guests");
  });

  test("a comfortable budget has no warnings", () => {
    const plan = buildBudget(makeInput(), 120);
    expect(plan.health).toBe("comfortable");
    expect(plan.warnings).toEqual([]);
  });
});

describe("adjustSplit", () => {
  test("weights stay normalised after adjustments", () => {
    const split = adjustSplit(makeInput({ setting: "outdoor", considerations: ["accessibility"] }));
    expect(sum(split.map((c) => c.weight))).toBeCloseTo(1, 10);
    expect(split.map((c) => c.id)).toContain("weather");
    expect(split.map((c) => c.id)).toContain("access");
  });

  test("at home, the venue becomes a smaller rentals line", () => {
    const home = adjustSplit(makeInput({ setting: "home" })).find((c) => c.id === "venue")!;
    const hall = adjustSplit(makeInput()).find((c) => c.id === "venue")!;
    expect(home.label).toContain("Rentals");
    expect(home.weight).toBeLessThan(hall.weight);
  });
});
