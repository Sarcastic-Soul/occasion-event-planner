import { getGemini } from "@/lib/ai/gemini";
import { createPlan, refineInput } from "@/lib/ai/planner";
import { refineRequestSchema } from "@/lib/plan/schema";
import { checkClientToday } from "@/lib/plan/validation";
import { clientKey, jsonError, readJson } from "@/lib/server/http";
import { RateLimiter } from "@/lib/server/rate-limit";

const limiter = new RateLimiter(10, 60_000);

export async function POST(request: Request): Promise<Response> {
  if (!limiter.check(clientKey(request))) {
    return jsonError(429, "Too many changes at once. Please wait a minute and try again.");
  }

  const ai = getGemini();
  if (!ai) return jsonError(503, "Changing the plan in words needs the AI service, which is not set up. Edit the form instead.");

  const parsed = await readJson(request, refineRequestSchema);
  if (!parsed.ok) return parsed.response;
  const { input, today, message } = parsed.data;
  if (!checkClientToday(today)) return jsonError(400, "Your device date looks wrong.");

  try {
    const result = await refineInput(input, today, message, ai);
    const plan = result.changed ? await createPlan(result.input, today, ai) : null;
    return Response.json({ reply: result.reply, plan }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return jsonError(502, "The AI service did not answer properly. Please try again or edit the form.");
  }
}
