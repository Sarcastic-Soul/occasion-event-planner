import { describe, expect, test } from "bun:test";
import { addDays } from "@/lib/plan/dates";
import { planRequestSchema } from "@/lib/plan/schema";
import { readPlanRequest } from "@/lib/server/plan-request";
import { RateLimiter } from "@/lib/server/rate-limit";
import { makeInput } from "./fixtures";

const today = new Date().toISOString().slice(0, 10);
const request = (body: unknown) =>
  new Request("http://localhost/api/plan", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "7.7.7.7" },
    body: JSON.stringify(body),
  });
const read = (body: unknown, limiter = new RateLimiter(5, 60_000)) =>
  readPlanRequest(request(body), planRequestSchema, limiter, "Slow down");

async function statusOf(result: Awaited<ReturnType<typeof read>>): Promise<number> {
  return result.ok ? 200 : result.response.status;
}

describe("readPlanRequest", () => {
  test("passes a valid request through unchanged", async () => {
    const input = makeInput({ date: addDays(today, 40) });
    const result = await read({ input, today });
    expect(result.ok && result.data.input).toEqual(input);
  });

  test("answers 429 with the route's own message once the limit is hit", async () => {
    const limiter = new RateLimiter(1, 60_000);
    const body = { input: makeInput({ date: addDays(today, 40) }), today };
    await read(body, limiter);
    const blocked = await read(body, limiter);
    expect(await statusOf(blocked)).toBe(429);
    expect(!blocked.ok && (await blocked.response.json()).error).toBe("Slow down");
  });

  test("rejects a skewed device date and an event too far ahead", async () => {
    const skewed = await read({ input: makeInput({ date: addDays(today, 40) }), today: addDays(today, 3) });
    const farAway = await read({ input: makeInput({ date: addDays(today, 4 * 366) }), today });
    expect(await statusOf(skewed)).toBe(400);
    expect(await statusOf(farAway)).toBe(400);
    expect(!farAway.ok && (await farAway.response.json()).fields[0].message).toBe("more than 3 years away");
  });
});
