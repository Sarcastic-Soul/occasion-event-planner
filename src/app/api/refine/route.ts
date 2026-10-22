import { getGemini } from "@/lib/ai/gemini";
import { createPlan, refineInput } from "@/lib/ai/planner";
import { refineRequestSchema } from "@/lib/plan/schema";
import { NO_STORE, jsonError } from "@/lib/server/http";
import { readPlanRequest } from "@/lib/server/plan-request";
import { RateLimiter } from "@/lib/server/rate-limit";

/** Two model calls in a row (read the change, then redraft), each capped by the Gemini deadline. */
export const maxDuration = 60;

const limiter = new RateLimiter(10, 60_000);

export async function POST(request: Request): Promise<Response> {
  const ai = getGemini();
  if (!ai) {
    return jsonError(
      503,
      "Changing the plan in words needs the AI service, which is not set up. Edit the form instead.",
    );
  }

  const parsed = await readPlanRequest(
    request,
    refineRequestSchema,
    limiter,
    "Too many changes at once. Please wait a minute and try again.",
  );
  if (!parsed.ok) return parsed.response;
  const { input, today, message } = parsed.data;

  try {
    const result = await refineInput(input, today, message, ai);
    const plan = result.changed ? await createPlan(result.input, today, ai) : null;
    return Response.json({ reply: result.reply, plan }, { headers: NO_STORE });
  } catch {
    return jsonError(502, "The AI service did not answer properly. Please try again or edit the form.");
  }
}
