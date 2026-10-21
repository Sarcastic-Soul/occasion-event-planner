import { describe, expect, test } from "bun:test";
import { addDays, daysBetween, isRealDate } from "@/lib/plan/dates";
import { checkClientToday, checkEventDate } from "@/lib/plan/validation";
import { defaultDraft, validateDraft } from "@/lib/client/draft";
import { TODAY } from "./fixtures";

describe("dates", () => {
  test("day math is timezone safe across month ends and leap days", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(daysBetween("2026-12-31", "2027-01-01")).toBe(1);
    expect(isRealDate("2027-02-30")).toBe(false);
  });
});

describe("checkEventDate", () => {
  test("rejects past, far-future and fake dates", () => {
    expect(checkEventDate("2026-10-20", TODAY)).toBe("already in the past");
    expect(checkEventDate("2030-01-01", TODAY)).toBe("more than 3 years away");
    expect(checkEventDate("2027-02-31", TODAY)).toBe("not a real calendar date");
    expect(checkEventDate(TODAY, TODAY)).toBeNull();
  });
});

describe("checkClientToday", () => {
  const server = new Date("2026-10-21T12:00:00Z");
  test("allows one day either side for timezones", () => {
    expect(checkClientToday("2026-10-22", server)).toBe(true);
    expect(checkClientToday("2026-10-20", server)).toBe(true);
    expect(checkClientToday("2026-10-25", server)).toBe(false);
  });
});

describe("validateDraft", () => {
  test("accepts grouped numbers like 15,00,000", () => {
    const result = validateDraft({ ...defaultDraft(TODAY), budget: "15,00,000" }, TODAY);
    expect(result.ok && result.input.budget).toBe(1_500_000);
  });

  test("returns readable errors per field", () => {
    const result = validateDraft({ ...defaultDraft(TODAY), guests: "abc", date: "2020-01-01" }, TODAY);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.guests).toContain("guest count");
      expect(result.errors.date).toContain("past");
    }
  });
});
