import { afterEach, describe, expect, mock, test } from "bun:test";
import type { JsonGenerator } from "@/lib/ai/generator";
import { localToday } from "@/lib/client/format";
import { addDays } from "@/lib/plan/dates";
import { makeInput } from "./fixtures";

// Route handlers never touch the network: Gemini is off, or replaced by a scripted fake.
let fakeAi: JsonGenerator | null = null;
mock.module("@/lib/ai/gemini", () => ({ getGemini: () => fakeAi }));
afterEach(() => {
  fakeAi = null;
});

/** A fake model that returns the given replies in order. */
function scripted(...replies: object[]): JsonGenerator {
  let call = 0;
  return { generate: async () => JSON.stringify(replies[call++]) };
}

const noChanges = { guests: null, budget: null, date: null, setting: null, addConsiderations: [], notesToAdd: null };
const enrichment = {
  summary: "A garden wedding.",
  ideas: [{ title: "Lantern path", description: "Light the walkway.", costHint: "low" }],
  extraTasks: [{ title: "Book rooms for family", weeksBefore: 6 }],
  budgetTips: ["Buy flowers in season."],
};
const { POST: planPOST } = await import("@/app/api/plan/route");
const { POST: refinePOST } = await import("@/app/api/refine/route");

const today = new Date().toISOString().slice(0, 10);
const post = (body: unknown, ip = "1.1.1.1") =>
  new Request("http://localhost/api/plan", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });

describe("POST /api/plan", () => {
  test("returns a rule-based plan when AI is not configured", async () => {
    const res = await planPOST(post({ input: makeInput({ date: addDays(today, 100) }), today }));
    expect(res.status).toBe(200);
    const plan = await res.json();
    expect(plan.daysLeft).toBe(100);
    expect(plan.ideasSource).toBe("rules");
  });

  test("rejects a past event date with a field error", async () => {
    const res = await planPOST(post({ input: makeInput({ date: addDays(today, -1) }), today }));
    expect(res.status).toBe(400);
    expect((await res.json()).fields[0].path).toBe("input.date");
  });

  test("rejects a skewed device date", async () => {
    const res = await planPOST(post({ input: makeInput({ date: addDays(today, 30) }), today: addDays(today, 5) }));
    expect(res.status).toBe(400);
  });

  test("rate limits bursts from one client", async () => {
    const body = { input: makeInput({ date: addDays(today, 60) }), today };
    const statuses: number[] = [];
    for (let i = 0; i < 21; i++) statuses.push((await planPOST(post(body, "9.9.9.9"))).status);
    expect(statuses.slice(0, 20).every((s) => s === 200)).toBe(true);
    expect(statuses[20]).toBe(429);
  });
});

describe("POST /api/refine", () => {
  test("explains that AI is needed when it is not configured", async () => {
    const res = await refinePOST(post({ input: makeInput(), today: localToday(), message: "fewer guests" }));
    expect(res.status).toBe(503);
  });

  test("rejects a plan whose event date is already past", async () => {
    fakeAi = scripted({ reply: "Ok", changes: noChanges });
    const res = await refinePOST(post({ input: makeInput({ date: addDays(today, -3) }), today, message: "fewer guests" }, "2.2.2.2"));
    expect(res.status).toBe(400);
    expect((await res.json()).fields[0].path).toBe("input.date");
  });

  test("applies the change and returns a redrafted plan", async () => {
    fakeAi = scripted({ reply: "Budget cut by 20%.", changes: { ...noChanges, budget: 1_200_000 } }, enrichment);
    const input = makeInput({ date: addDays(today, 120) });
    const res = await refinePOST(post({ input, today, message: "cut the budget by 20%" }, "3.3.3.3"));
    expect(res.status).toBe(200);
    const { reply, plan } = await res.json();
    expect(reply).toBe("Budget cut by 20%.");
    expect(plan.input.budget).toBe(1_200_000);
    expect(plan.ideasSource).toBe("ai");
    expect(plan.timeline.some((t: { id: string }) => t.id === "ai-book-rooms-for-family")).toBe(true);
  });

  test("returns no plan when the request changes nothing", async () => {
    fakeAi = scripted({ reply: "That is already the plan.", changes: noChanges });
    const res = await refinePOST(post({ input: makeInput({ date: addDays(today, 120) }), today, message: "keep it" }, "4.4.4.4"));
    expect(res.status).toBe(200);
    expect((await res.json()).plan).toBeNull();
  });

  test("answers 502 when the model reply is not valid", async () => {
    fakeAi = { generate: async () => "not json" };
    const res = await refinePOST(post({ input: makeInput({ date: addDays(today, 120) }), today, message: "make it bigger" }, "5.5.5.5"));
    expect(res.status).toBe(502);
  });
});
