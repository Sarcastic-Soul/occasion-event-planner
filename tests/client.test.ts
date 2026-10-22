import { describe, expect, test } from "bun:test";
import { validateDraft, defaultDraft } from "@/lib/client/draft";
import { errorMessage, isAbortError } from "@/lib/client/errors";
import { formatMoney } from "@/lib/client/format";
import { LIMIT_RULES } from "@/lib/plan/labels";
import { LIMITS } from "@/lib/plan/schema";
import { TODAY } from "./fixtures";

describe("error helpers", () => {
  test("recognise a cancelled request", () => {
    expect(isAbortError(new DOMException("stop", "AbortError"))).toBe(true);
    expect(isAbortError(new Error("boom"))).toBe(false);
    expect(isAbortError("AbortError")).toBe(false);
  });

  test("always produce a message to show", () => {
    expect(errorMessage(new Error("Server is down"))).toBe("Server is down");
    expect(errorMessage("odd value")).toBe("Something went wrong.");
    expect(errorMessage(new Error(""), "Try again")).toBe("Try again");
  });
});

describe("form messages", () => {
  test("quote the same limits the schema enforces", () => {
    const tooMany = validateDraft({ ...defaultDraft(TODAY), guests: String(LIMITS.maxGuests + 1) }, TODAY);
    expect(!tooMany.ok && tooMany.errors.guests).toBe(`Enter a guest count ${LIMIT_RULES.guests}.`);
    expect(LIMIT_RULES.guests).toBe("between 1 and 5,000");
  });

  test("accept grouped numbers like 15,00,000", () => {
    const result = validateDraft({ ...defaultDraft(TODAY), budget: "15,00,000" }, TODAY);
    expect(result.ok && result.input.budget).toBe(1_500_000);
  });
});

describe("formatMoney", () => {
  test("uses each currency's own grouping", () => {
    expect(formatMoney(1_500_000, "INR")).toBe("₹15,00,000");
    expect(formatMoney(1500, "USD")).toBe("$1,500");
  });
});
