import { z } from "zod";

export const EVENT_TYPES = ["wedding", "birthday", "community"] as const;
export const SETTINGS = ["indoor", "outdoor", "home"] as const;
export const CURRENCIES = ["INR", "USD", "EUR", "GBP"] as const;
export const CONSIDERATIONS = [
  "accessibility",
  "dietary",
  "kids",
  "elderly",
  "eco",
] as const;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

/** Plain text only: strips control characters so notes are safe to echo and to quote in prompts. */
const plainText = (max: number) =>
  z
    .string()
    .max(max)
    .transform((s) => s.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").trim());

export const eventInputSchema = z.object({
  eventType: z.enum(EVENT_TYPES),
  title: plainText(80).default(""),
  date: isoDate,
  guests: z.number().int().min(1).max(5000),
  budget: z.number().int().min(1).max(1_000_000_000),
  currency: z.enum(CURRENCIES).default("INR"),
  setting: z.enum(SETTINGS),
  considerations: z.array(z.enum(CONSIDERATIONS)).max(CONSIDERATIONS.length).default([]),
  notes: plainText(500).default(""),
});

export type EventInput = z.infer<typeof eventInputSchema>;
export type EventType = EventInput["eventType"];
export type Setting = EventInput["setting"];
export type Currency = EventInput["currency"];
export type Consideration = (typeof CONSIDERATIONS)[number];

export const planRequestSchema = z.object({
  input: eventInputSchema,
  /** The user's local calendar date, so countdowns match their timezone. */
  today: isoDate,
});

export const refineRequestSchema = z.object({
  input: eventInputSchema,
  today: isoDate,
  message: plainText(300).pipe(z.string().min(3, "Tell us what to change")),
});

/** What Gemini may return when enriching a plan. Validated before use. */
export const aiEnrichmentSchema = z.object({
  summary: z.string().max(400),
  ideas: z
    .array(
      z.object({
        title: z.string().max(80),
        description: z.string().max(300),
        costHint: z.enum(["low", "medium", "high"]),
      }),
    )
    .min(1)
    .max(5),
  extraTasks: z
    .array(
      z.object({
        title: z.string().max(120),
        weeksBefore: z.number().int().min(0).max(52),
      }),
    )
    .max(4),
  budgetTips: z.array(z.string().max(200)).max(4),
});

export type AiEnrichment = z.infer<typeof aiEnrichmentSchema>;

/**
 * What Gemini may return when the user asks for a change in plain words.
 * Only these fields can change; numbers are re-checked against the input schema.
 */
export const aiRefinementSchema = z.object({
  reply: z.string().max(300),
  changes: z.object({
    guests: z.number().int().nullable(),
    budget: z.number().int().nullable(),
    date: z.string().nullable(),
    setting: z.enum(SETTINGS).nullable(),
    addConsiderations: z.array(z.enum(CONSIDERATIONS)),
    notesToAdd: z.string().max(200).nullable(),
  }),
});

export type AiRefinement = z.infer<typeof aiRefinementSchema>;
