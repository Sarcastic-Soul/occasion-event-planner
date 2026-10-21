/**
 * Fixed-window limiter kept in memory. On serverless hosts each instance has its own
 * window, so this is a guard against bursts from one client, not a global quota.
 */
export class RateLimiter {
  private readonly hits = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly maxKeys = 5000,
  ) {}

  /** Returns true when the request is allowed. */
  check(key: string, now = Date.now()): boolean {
    const entry = this.hits.get(key);
    if (!entry || entry.resetAt <= now) {
      if (this.hits.size >= this.maxKeys) this.prune(now);
      this.hits.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }
    entry.count += 1;
    return entry.count <= this.limit;
  }

  private prune(now: number) {
    for (const [key, entry] of this.hits) {
      if (entry.resetAt <= now) this.hits.delete(key);
    }
    // Still full: drop the oldest entries (Map keeps insertion order).
    const overflow = this.hits.size - this.maxKeys + 1;
    if (overflow > 0) {
      for (const key of [...this.hits.keys()].slice(0, overflow)) this.hits.delete(key);
    }
  }
}
