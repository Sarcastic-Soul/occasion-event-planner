/** True when a request was cancelled on purpose, for example by a newer submit. */
export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

/** A message that is safe to show, whatever was thrown. */
export function errorMessage(error: unknown, fallback = "Something went wrong."): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
