/**
 * The one thing the app needs from a language model: JSON text matching a schema.
 * Kept as an interface so planning logic can be tested without network calls.
 */
export interface JsonGenerator {
  generate(request: { system: string; prompt: string; schema: object }): Promise<string>;
}

export class AiUnavailableError extends Error {
  constructor(message = "AI service is not configured") {
    super(message);
    this.name = "AiUnavailableError";
  }
}
