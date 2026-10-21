import { describe, expect, mock, test } from "bun:test";
import { ApiError, type GoogleGenAI } from "@google/genai";

// The real module guards against client imports; tests run outside Next.js.
mock.module("server-only", () => ({}));
const { GeminiGenerator } = await import("@/lib/ai/gemini");

/** A fake SDK client whose models answer (or fail) in the order given. */
function fakeClient(...outcomes: (string | number)[]) {
  const tried: string[] = [];
  const client = {
    models: {
      generateContent: async ({ model }: { model: string }) => {
        tried.push(model);
        const outcome = outcomes[tried.length - 1];
        if (typeof outcome === "number") throw new ApiError({ message: "failed", status: outcome });
        return { text: outcome };
      },
    },
  } as unknown as GoogleGenAI;
  return { client, tried };
}

const request = { system: "s", prompt: "p", schema: {} };

describe("GeminiGenerator", () => {
  test("moves to the next model when one is busy", async () => {
    const { client, tried } = fakeClient(503, '{"ok":true}');
    const text = await new GeminiGenerator(client, ["a", "b", "c"]).generate(request);
    expect(text).toBe('{"ok":true}');
    expect(tried).toEqual(["a", "b"]);
  });

  test("stops at once on a request the API will never accept", async () => {
    const { client, tried } = fakeClient(400, '{"ok":true}');
    await expect(new GeminiGenerator(client, ["a", "b"]).generate(request)).rejects.toThrow();
    expect(tried).toEqual(["a"]);
  });

  test("fails with the last error when every model is down", async () => {
    const { client, tried } = fakeClient(429, 503);
    await expect(new GeminiGenerator(client, ["a", "b"]).generate(request)).rejects.toBeInstanceOf(ApiError);
    expect(tried).toEqual(["a", "b"]);
  });

  test("treats an empty reply as a miss and tries the next model", async () => {
    const { client } = fakeClient("", '{"ok":true}');
    expect(await new GeminiGenerator(client, ["a", "b"]).generate(request)).toBe('{"ok":true}');
  });
});
