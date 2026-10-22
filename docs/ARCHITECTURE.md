# Architecture

Occasion is a single Next.js 16 app (App Router) run with Bun and deployed on Vercel. There is no database: plans and checklist ticks are kept in the browser's localStorage.

## The core idea: rules for facts, Gemini for judgment

| Part of the plan | Made by | Why |
|---|---|---|
| Budget split, per-guest figure, buffer, "tight budget" warning | Rules (`src/lib/plan/budget.ts`) | Money must add up exactly, every time |
| Timeline dates, "late" status, faster fallbacks | Rules (`src/lib/plan/timeline.ts`, `dates.ts`) | Dates must count back correctly from the event day |
| Vendor checklist and book-by dates | Rules (`src/lib/plan/vendors.ts`) | Lead times are known facts per event type |
| Ideas, extra tasks, budget tips, summary | Gemini (`src/lib/ai/planner.ts`) | Needs to read free-text notes and suggest things rules cannot |
| Plain-language changes ("cut budget by 20%") | Gemini returns field changes, rules check them (`src/lib/plan/refine.ts`) | The model understands the request; rules decide what is allowed |

Gemini never writes a number or a date that reaches the user without being checked. If Gemini is missing, slow or returns bad JSON, the user still gets the full rule-based plan with starter ideas.

## Request flow

```
Browser (IntakeForm)
  │  typing: buildBasePlan() runs in the browser for a live preview, no network
  │  "Draft my plan": POST /api/plan { input, today }
  ▼
/api/plan  (src/app/api/plan/route.ts)
  1. RateLimiter.check(client ip)            20 per minute, else 429
  2. readJson(request, planRequestSchema)    415 / 413 / 400 with field errors
  3. checkClientToday(today)                 device date within 1 day of server
  4. checkEventDate(input.date, today)       not past, real, within 3 years
  5. LruCache lookup (200 entries)
  6. createPlan(input, today, getGemini())
       buildBasePlan()  ──►  Gemini enrichment  ──►  aiEnrichmentSchema.safeParse
                                                  ──►  mergeEnrichment()  (or keep base plan)
  ▼
EventPlan JSON  ──►  PlanSheet renders it, saved to localStorage

RefineBox: POST /api/refine { input, today, message }
  same checks, then refineInput(): Gemini returns aiRefinementSchema
  ──► applyRefinement() checks each field on its own ──► createPlan() with the new input
```

## Modules

| Folder | Responsibility | Depends on |
|---|---|---|
| `src/lib/plan/` | Pure planning rules: Zod schemas, budget, timeline, vendors, dates, validation, refine checks, fallback ideas. No I/O, runs in browser and server. | `zod` only |
| `src/lib/ai/` | `JsonGenerator` interface, Gemini client with model fallback, prompts, `createPlan` / `refineInput` | `plan/`, `@google/genai` |
| `src/lib/server/` | `RateLimiter`, `LruCache`, `readJson` / `jsonError` helpers | `zod` types |
| `src/lib/client/` | Form draft parsing, fetch wrappers with timeouts, formatting, localStorage | `plan/` |
| `src/components/planner/` | `Planner` (layout), `IntakeForm`, `PlanSheet`, `RefineBox`, `usePlanner` hook (all state) | `lib/client`, `lib/plan` |
| `src/app/api/` | Two POST route handlers, thin: validate, call `lib/ai`, return JSON | everything above |

Key design choices:

- **`JsonGenerator` interface** (`src/lib/ai/generator.ts`). Planning code depends on "something that returns JSON for a schema", not on Gemini. Tests pass a fake; production passes `GeminiGenerator`.
- **One schema, three uses.** `aiEnrichmentSchema` (Zod) is turned into the JSON Schema sent to Gemini as `responseJsonSchema`, used to validate the reply, and gives the TypeScript type.
- **`server-only` guard** on `src/lib/ai/gemini.ts`, so the Gemini client and key can never be bundled into browser code.
- **Pure functions take `today` as an argument**, so every date rule is deterministic and testable without mocking the clock.

## Gemini usage

- Models tried in order: `gemini-flash-latest`, `gemini-3-flash-preview`, `gemini-flash-lite-latest` (override with `GEMINI_MODEL`, comma separated).
- Moves to the next model on HTTP 404, 429, 500, 503 or an empty reply. Stops at once on other errors (for example 400).
- All models share one 20 s deadline (`AbortSignal.timeout`), and the routes set `maxDuration` (30 s for plan, 60 s for refine, which makes two calls).
- Structured output: `responseMimeType: "application/json"` plus `responseJsonSchema`.
- Prompt injection: user text is sent inside a JSON object, and the system prompt tells the model to treat `title` and `notes` as facts, not instructions. Output is validated regardless.

## Personalization rules (what changes with the user's details)

| Detail | Effect |
|---|---|
| Event type | Different budget categories, tasks, vendors and lead times (wedding venue 24 weeks ahead, birthday venue 5, community venue 8) |
| Days left | Overdue tasks move to today, marked "late", with a faster fallback; under 30 days the buffer grows from 10% to 15% |
| Budget per guest | Under a floor per event type and currency the plan is flagged "tight" and suggests a guest count that fits |
| Setting | Home: venue becomes rentals, rental supplier added. Outdoor: weather backup line, canopy vendor |
| Guest count | Serving staff about 1 per 20 guests, sound size, day-of coordinator above 150 guests |
| Access / older guests | Access budget line, venue walk-through task, accessible transport vendor |
| Dietary, kids, eco | Matching tasks and vendors |
| Notes | Sent to Gemini for ideas and extra tasks |

## Known limits

- `RateLimiter` and `LruCache` live in memory, so on serverless they apply per instance. A shared store (Redis) would be the next step.
- CSP keeps `'unsafe-inline'` for scripts because Next.js injects inline hydration scripts; a nonce-based CSP would remove it.
- Cost floors and lead times are rough market figures, not quotes.
