import { z } from "zod";
import { buildBasePlan, mergeEnrichment } from "../plan/build-plan";
import { aiEnrichmentSchema, aiRefinementSchema, type EventInput } from "../plan/schema";
import type { EventPlan, RefineResult } from "../plan/types";
import { applyRefinement } from "../plan/refine";
import type { JsonGenerator } from "./generator";
import { ENRICH_SYSTEM, REFINE_SYSTEM, enrichPrompt, refinePrompt } from "./prompts";

/** JSON Schema for the model's structured output, without the "$schema" marker the API does not need. */
function toModelSchema(schema: z.ZodType): object {
  const jsonSchema: Record<string, unknown> = z.toJSONSchema(schema);
  delete jsonSchema.$schema;
  return jsonSchema;
}

const enrichJsonSchema = toModelSchema(aiEnrichmentSchema);
const refineJsonSchema = toModelSchema(aiRefinementSchema);

/**
 * Builds the rule-based plan, then asks the model for personal touches.
 * If the model is missing, slow or returns bad JSON, the rule-based plan is still returned.
 */
export async function createPlan(input: EventInput, today: string, ai: JsonGenerator | null): Promise<EventPlan> {
  const base = buildBasePlan(input, today);
  if (!ai) return base;
  try {
    const text = await ai.generate({ system: ENRICH_SYSTEM, prompt: enrichPrompt(base), schema: enrichJsonSchema });
    const parsed = aiEnrichmentSchema.safeParse(JSON.parse(text));
    return parsed.success ? mergeEnrichment(base, parsed.data, today) : base;
  } catch {
    return base;
  }
}

/** Turns a plain-language request ("cut the budget by 20%") into a checked, updated input. */
export async function refineInput(
  input: EventInput,
  today: string,
  message: string,
  ai: JsonGenerator,
): Promise<RefineResult> {
  const text = await ai.generate({
    system: REFINE_SYSTEM,
    prompt: refinePrompt(input, today, message),
    schema: refineJsonSchema,
  });
  const refinement = aiRefinementSchema.parse(JSON.parse(text));
  return applyRefinement(input, refinement, today);
}
