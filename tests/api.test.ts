import { describe, expect, mock, test } from "bun:test";
import { localToday } from "@/lib/client/format";
import { addDays } from "@/lib/plan/dates";
import { makeInput } from "./fixtures";

// Route handlers run without Gemini so tests never touch the network.
mock.module("@/lib/ai/gemini", () => ({ getGemini: () => null }));
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
    for (let i = 0; i < 22; i++) statuses.push((await planPOST(post(body, "9.9.9.9"))).status);
    expect(statuses.at(-1)).toBe(429);
  });
});

describe("POST /api/refine", () => {
  test("explains that AI is needed when it is not configured", async () => {
    const res = await refinePOST(post({ input: makeInput(), today: localToday(), message: "fewer guests" }));
    expect(res.status).toBe(503);
  });
});
