import { getGemini } from "@/lib/ai/gemini";
import { createPlan } from "@/lib/ai/planner";
import { planRequestSchema } from "@/lib/plan/schema";
import type { EventPlan } from "@/lib/plan/types";
import { NO_STORE } from "@/lib/server/http";
import { LruCache } from "@/lib/server/lru-cache";
import { readPlanRequest } from "@/lib/server/plan-request";
import { RateLimiter } from "@/lib/server/rate-limit";

/** Room for the Gemini deadline plus the rule-based work. */
export const maxDuration = 30;

const limiter = new RateLimiter(20, 60_000);
/** Only plans with Gemini's ideas are cached; rule-only plans are cheap to rebuild. */
const plans = new LruCache<EventPlan>(200);

export async function POST(request: Request): Promise<Response> {
  const parsed = await readPlanRequest(
    request,
    planRequestSchema,
    limiter,
    "Too many plans at once. Please wait a minute and try again.",
  );
  if (!parsed.ok) return parsed.response;
  const { input, today } = parsed.data;

  const cacheKey = JSON.stringify(parsed.data);
  const plan = plans.get(cacheKey) ?? (await createPlan(input, today, getGemini()));
  if (plan.ideasSource === "ai") plans.set(cacheKey, plan);

  return Response.json(plan, { headers: NO_STORE });
}
