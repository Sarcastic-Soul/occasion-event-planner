import "server-only";
import { ApiError, GoogleGenAI } from "@google/genai";
import { AiUnavailableError, type JsonGenerator } from "./generator";

/** Tried in order; the next model is used when one is busy or retired. */
const DEFAULT_MODELS = ["gemini-flash-latest", "gemini-3-flash-preview", "gemini-flash-lite-latest"];
/** One deadline shared by every model in the chain, so a slow day cannot stack up timeouts. */
const DEADLINE_MS = 20_000;
/** Overloaded, rate limited or no longer offered: worth trying another model. */
const RETRYABLE_STATUS = new Set([404, 429, 500, 503]);

export class GeminiGenerator implements JsonGenerator {
  constructor(
    private readonly client: GoogleGenAI,
    private readonly models: string[],
  ) {}

  async generate({ system, prompt, schema }: { system: string; prompt: string; schema: object }): Promise<string> {
    const deadline = AbortSignal.timeout(DEADLINE_MS);
    let lastError: unknown = new AiUnavailableError("No model answered in time");
    for (const model of this.models) {
      if (deadline.aborted) break;
      try {
        const response = await this.client.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction: system,
            responseMimeType: "application/json",
            responseJsonSchema: schema,
            temperature: 0.7,
            abortSignal: deadline,
          },
        });
        if (response.text) return response.text;
        lastError = new AiUnavailableError(`Empty response from ${model}`);
      } catch (error) {
        lastError = error;
        if (error instanceof ApiError && !RETRYABLE_STATUS.has(error.status)) throw error;
      }
    }
    throw lastError;
  }
}

let cached: JsonGenerator | null | undefined;

/**
 * Returns a Gemini client when GEMINI_API_KEY is set, otherwise null so callers fall back to rules.
 * GEMINI_MODEL may list several comma-separated models to try in order.
 */
export function getGemini(): JsonGenerator | null {
  if (cached !== undefined) return cached;
  const apiKey = process.env.GEMINI_API_KEY;
  const configured = process.env.GEMINI_MODEL?.split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  cached = apiKey
    ? new GeminiGenerator(new GoogleGenAI({ apiKey }), configured?.length ? configured : DEFAULT_MODELS)
    : null;
  return cached;
}
