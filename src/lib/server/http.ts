import type { z } from "zod";

const MAX_BODY_BYTES = 8 * 1024;

export function jsonError(status: number, message: string, extra?: Record<string, unknown>): Response {
  return Response.json({ error: message, ...extra }, { status, headers: { "Cache-Control": "no-store" } });
}

/** Best-effort client id for rate limiting; Vercel sets x-forwarded-for. */
export function clientKey(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
}

type Parsed<T> = { ok: true; data: T } | { ok: false; response: Response };

/** Reads a small JSON body and validates it, returning a ready 4xx response on failure. */
export async function readJson<T>(request: Request, schema: z.ZodType<T>): Promise<Parsed<T>> {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return { ok: false, response: jsonError(415, "Expected application/json") };
  }
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return { ok: false, response: jsonError(413, "Request too large") };
  }
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return { ok: false, response: jsonError(400, "Invalid JSON") };
  }
  const result = schema.safeParse(body);
  if (!result.success) {
    const fields = result.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
    return { ok: false, response: jsonError(400, "Some details need fixing", { fields }) };
  }
  return { ok: true, data: result.data };
}
