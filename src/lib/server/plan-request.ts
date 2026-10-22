import type { z } from "zod";
import type { EventInput } from "../plan/schema";
import { checkClientToday, checkEventDate } from "../plan/validation";
import { clientKey, jsonError, readJson, type Parsed } from "./http";
import type { RateLimiter } from "./rate-limit";

interface PlanRequestBase {
  input: EventInput;
  today: string;
}

/**
 * The checks every planning route runs before doing any work: rate limit, body shape,
 * the device date and the event date. Returns the parsed body or a ready error response.
 */
export async function readPlanRequest<T extends PlanRequestBase>(
  request: Request,
  schema: z.ZodType<T>,
  limiter: RateLimiter,
  busyMessage: string,
): Promise<Parsed<T>> {
  if (!limiter.check(clientKey(request))) {
    return { ok: false, response: jsonError(429, busyMessage) };
  }

  const parsed = await readJson(request, schema);
  if (!parsed.ok) return parsed;
  const { input, today } = parsed.data;

  if (!checkClientToday(today)) {
    return { ok: false, response: jsonError(400, "Your device date looks wrong.") };
  }
  const dateProblem = checkEventDate(input.date, today);
  if (dateProblem) {
    const fields = [{ path: "input.date", message: dateProblem }];
    return { ok: false, response: jsonError(400, `Event date is ${dateProblem}.`, { fields }) };
  }
  return parsed;
}
