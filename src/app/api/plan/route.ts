import { getGemini } from "@/lib/ai/gemini";
import { createPlan } from "@/lib/ai/planner";
import { planRequestSchema } from "@/lib/plan/schema";
import type { EventPlan } from "@/lib/plan/types";
import { checkClientToday, checkEventDate } from "@/lib/plan/validation";
import { clientKey, jsonError, readJson } from "@/lib/server/http";
import { LruCache } from "@/lib/server/lru-cache";
import { RateLimiter } from "@/lib/server/rate-limit";

const limiter = new RateLimiter(20, 60_000);
const plans = new LruCache<EventPlan>(200);

export async function POST(request: Request): Promise<Response> {
  if (!limiter.check(clientKey(request))) {
    return jsonError(429, "Too many plans at once. Please wait a minute and try again.");
  }

  const parsed = await readJson(request, planRequestSchema);
  if (!parsed.ok) return parsed.response;
  const { input, today } = parsed.data;

  if (!checkClientToday(today)) return jsonError(400, "Your device date looks wrong.");
  const dateProblem = checkEventDate(input.date, today);
  if (dateProblem) {
    return jsonError(400, `Event date is ${dateProblem}.`, { fields: [{ path: "input.date", message: dateProblem }] });
  }

  const cacheKey = JSON.stringify(parsed.data);
  const plan = plans.get(cacheKey) ?? (await createPlan(input, today, getGemini()));
  if (plan.ideasSource === "ai") plans.set(cacheKey, plan);

  return Response.json(plan, { headers: { "Cache-Control": "no-store" } });
}
