import type { EventInput } from "../plan/schema";
import type { EventPlan } from "../plan/types";

export interface FieldError {
  path: string;
  message: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly fields: FieldError[] = [],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function post<T>(url: string, body: unknown, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error;
    throw new ApiError("Could not reach the server. Check your connection and try again.");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(data.error ?? "Something went wrong.", data.fields ?? []);
  return data as T;
}

export function requestPlan(input: EventInput, today: string, signal?: AbortSignal) {
  return post<EventPlan>("/api/plan", { input, today }, signal);
}

/** Refining makes two model calls on the server, so give up after the server's own limit. */
const REFINE_TIMEOUT_MS = 60_000;

export function requestRefine(input: EventInput, today: string, message: string) {
  const body = { input, today, message };
  return post<{ reply: string; plan: EventPlan | null }>("/api/refine", body, AbortSignal.timeout(REFINE_TIMEOUT_MS));
}
