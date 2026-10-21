import { describe, expect, test } from "bun:test";
import { applyRefinement } from "@/lib/plan/refine";
import type { AiRefinement } from "@/lib/plan/schema";
import { TODAY, makeInput } from "./fixtures";

const noChanges: AiRefinement["changes"] = {
  guests: null,
  budget: null,
  date: null,
  setting: null,
  addConsiderations: [],
  notesToAdd: null,
};

describe("applyRefinement", () => {
  test("applies valid changes", () => {
    const result = applyRefinement(
      makeInput(),
      { reply: "Done.", changes: { ...noChanges, budget: 1_200_000, addConsiderations: ["eco"] } },
      TODAY,
    );
    expect(result.changed).toBe(true);
    expect(result.input.budget).toBe(1_200_000);
    expect(result.input.considerations).toEqual(["eco"]);
  });

  test("skips a past date but keeps other changes", () => {
    const result = applyRefinement(
      makeInput(),
      { reply: "Moved.", changes: { ...noChanges, date: "2020-01-01", guests: 90 } },
      TODAY,
    );
    expect(result.input.guests).toBe(90);
    expect(result.input.date).toBe(makeInput().date);
    expect(result.reply).toContain("Skipped: date");
  });

  test("rejects values outside the form limits", () => {
    const input = makeInput();
    const result = applyRefinement(input, { reply: "Ok", changes: { ...noChanges, guests: 999_999 } }, TODAY);
    expect(result.changed).toBe(false);
    expect(result.input).toEqual(input);
    expect(result.reply).toContain("Skipped: guests");
  });

  test("keeps a valid change when another one is out of range", () => {
    const result = applyRefinement(
      makeInput(),
      { reply: "Ok", changes: { ...noChanges, guests: 999_999, budget: 900_000 } },
      TODAY,
    );
    expect(result.changed).toBe(true);
    expect(result.input.budget).toBe(900_000);
    expect(result.input.guests).toBe(makeInput().guests);
    expect(result.reply).toContain("Skipped: guests");
  });
});
