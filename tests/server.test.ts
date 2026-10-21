import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { readJson } from "@/lib/server/http";
import { LruCache } from "@/lib/server/lru-cache";
import { RateLimiter } from "@/lib/server/rate-limit";

describe("RateLimiter", () => {
  test("blocks after the limit and resets after the window", () => {
    const limiter = new RateLimiter(2, 1000);
    expect([limiter.check("a", 0), limiter.check("a", 1), limiter.check("a", 2)]).toEqual([true, true, false]);
    expect(limiter.check("b", 2)).toBe(true);
    expect(limiter.check("a", 1001)).toBe(true);
  });

  test("never holds more than maxKeys clients", () => {
    const limiter = new RateLimiter(1, 60_000, 3);
    for (const key of ["a", "b", "c", "d"]) limiter.check(key, 0);
    // "a" was evicted, so it starts a fresh window.
    expect(limiter.check("a", 1)).toBe(true);
  });
});

describe("LruCache", () => {
  test("evicts the least recently used item", () => {
    const cache = new LruCache<number>(2);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.get("a");
    cache.set("c", 3);
    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("a")).toBe(1);
  });
});

describe("readJson", () => {
  const schema = z.object({ n: z.number() });
  const req = (body: string, type = "application/json") =>
    new Request("http://x", { method: "POST", body, headers: { "content-type": type } });

  test("parses valid bodies", async () => {
    const result = await readJson(req('{"n":1}'), schema);
    expect(result.ok && result.data.n).toBe(1);
  });

  test("rejects wrong content type, oversize, bad JSON and bad shape", async () => {
    const statuses = await Promise.all(
      [req("{}", "text/plain"), req("x".repeat(9000)), req("{"), req('{"n":"1"}')].map(async (r) => {
        const result = await readJson(r, schema);
        return result.ok ? 200 : result.response.status;
      }),
    );
    expect(statuses).toEqual([415, 413, 400, 400]);
  });
});
