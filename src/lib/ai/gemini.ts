import "server-only";
import { GoogleGenAI } from "@google/genai";
import { AiUnavailableError, type JsonGenerator } from "./generator";

const DEFAULT_MODEL = "gemini-flash-latest";
const TIMEOUT_MS = 20_000;

class GeminiGenerator implements JsonGenerator {
  constructor(
    private readonly client: GoogleGenAI,
    private readonly model: string,
  ) {}

  async generate({ system, prompt, schema }: { system: string; prompt: string; schema: object }): Promise<string> {
    const response = await this.client.models.generateContent({
      model: this.model,
      contents: prompt,
      config: {
        systemInstruction: system,
        responseMimeType: "application/json",
        responseJsonSchema: schema,
        temperature: 0.7,
        abortSignal: AbortSignal.timeout(TIMEOUT_MS),
      },
    });
    const text = response.text;
    if (!text) throw new AiUnavailableError("Empty response from Gemini");
    return text;
  }
}

let cached: JsonGenerator | null | undefined;

/** Returns a Gemini client when GEMINI_API_KEY is set, otherwise null so callers fall back to rules. */
export function getGemini(): JsonGenerator | null {
  if (cached !== undefined) return cached;
  const apiKey = process.env.GEMINI_API_KEY;
  cached = apiKey
    ? new GeminiGenerator(new GoogleGenAI({ apiKey }), process.env.GEMINI_MODEL || DEFAULT_MODEL)
    : null;
  return cached;
}
