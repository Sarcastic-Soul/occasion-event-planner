# Occasion

A planning assistant for weddings, birthdays and community events. Tell it the occasion, the date, the guest count and the budget, and it gives you a budget split, a timeline that counts back from the day, a vendor checklist sized to your guest list, and ideas made for your event by Gemini. You can then change the plan in plain words ("cut the budget by 20%", "make it 40 guests").

**Chosen vertical:** Challenge 5, Celebration & Event Planner.

## How it works

The app splits the work in two:

1. **Rules handle anything that has to be right.** Money and dates come from plain TypeScript functions in `src/lib/plan/`, not from the model. The budget always adds up to the exact total, and every due date counts back from the event date.
2. **Gemini handles what rules cannot.** It gets the event details and the finished rule-based plan, and returns ideas that fit this event, up to four extra tasks its details call for, money-saving tips and a short summary. It cannot change the numbers.

```
Form ──► /api/plan ──► buildBasePlan (rules) ──► Gemini enrichment ──► merged plan
                              │                        │
                              │                        └─ bad JSON, timeout or no key: keep the rules plan
                              └─ also runs in the browser as a live preview while you type

"Cut budget 20%" ──► /api/refine ──► Gemini returns field changes ──► checked against the form rules ──► new plan
```

### Decisions based on the user's details

| Detail | What changes |
|---|---|
| Event type | Base budget split, task list, vendor list and lead times (a wedding venue is booked 24 weeks out, a birthday venue 5) |
| Days left | Tasks whose ideal date has passed move to today, marked "late", with a faster option (e.g. "send a digital invite today"). Under 30 days the buffer goes from 10% to 15% for rush fees |
| Budget per guest | Below a rough floor for the event type and currency, the plan is flagged as tight and suggests a guest count that fits |
| Setting | At home: venue becomes a smaller rentals line and a rental supplier is added. Outdoor: weather backup line, canopy vendor and task. Community event at home: no permits task |
| Guest count | Serving staff (about 1 per 20 guests), sound system size, and a day-of coordinator above 150 guests |
| Wheelchair access / older guests | Access budget line, venue access walk-through, accessible transport vendor |
| Dietary needs, children, low waste | Matching tasks and vendors (dietary labels, entertainer, return gifts, compostable serveware) |
| Notes | Sent to Gemini as facts about the event, used for ideas and extra tasks |

## Gen AI used

- **Gemini API** (`@google/genai`, model set by `GEMINI_MODEL`, default `gemini-flash-latest`), called only from the server:
  - `/api/plan`: personal ideas, extra tasks, budget tips and a summary, using structured JSON output (`responseJsonSchema`) built from the same Zod schema that validates the reply.
  - `/api/refine`: turns a plain-language change request into specific field changes, which are re-checked against the form rules before the plan is rebuilt.

## Security

- The Gemini key lives only in server env vars (`server-only` import guard); the browser never sees it.
- Every request body is size-limited (8 KB), content-type checked and validated with Zod. Text fields are length-capped and stripped of control characters.
- Model output is parsed and validated with Zod before use; invalid output falls back to the rules plan. Changes suggested by the model go through the same checks as the form.
- User text is sent as JSON data, and the system prompt tells the model to treat it as facts, not instructions.
- Per-client rate limiting (20 plans and 10 refinements a minute per instance), plus a strict Content Security Policy, `X-Frame-Options: DENY`, `nosniff` and a tight `Permissions-Policy`.
- The server checks the device date sent by the browser is within a day of its own, so countdowns cannot be skewed.

## Efficiency

- The rule-based plan is pure and fast, so it also runs in the browser as a live preview: no network call while typing.
- One Gemini call per plan, with a 20 s timeout. Results are kept in a small in-memory LRU cache, so the same request does not call the model twice.
- No UI framework beyond React, no images, CSS-only motion on `transform` and `opacity`, and fonts self-hosted by `next/font`.

## Accessibility

- Real `<fieldset>`/`<legend>` radio groups and checkboxes; every control has a label.
- Errors are linked to their fields with `aria-describedby` and `aria-invalid`; pressing "Draft my plan" with an error moves focus to the first bad field.
- Status updates use `aria-live` regions. Skip link, visible focus rings, 44 px touch targets.
- Text and control borders meet WCAG AA contrast. Motion is turned off under `prefers-reduced-motion`.
- A print stylesheet so the plan prints or saves as a clean PDF.

## Running it

Needs [Bun](https://bun.sh) 1.3 or later.

```bash
bun install
cp .env.example .env      # then add your GEMINI_API_KEY
bun run dev               # http://localhost:3000
```

Without a key the app still works, with starter ideas instead of Gemini ones; only "change in plain words" needs the key.

```bash
bun run check   # typecheck + lint + tests
bun test        # 41 tests: budget, timeline, vendors, dates, refine, AI fallback, API routes, form a11y
bun run build
```

### Deploying to Vercel

Import the repo in Vercel (it detects Next.js and Bun), then add `GEMINI_API_KEY` under Project Settings, Environment Variables.

## Project layout

```
src/
  app/
    api/plan/route.ts      POST: validate, build plan, enrich with Gemini
    api/refine/route.ts    POST: plain-language change to the plan
    layout.tsx, page.tsx
  components/planner/      Planner, IntakeForm, PlanSheet, RefineBox, use-planner hook
  lib/
    plan/                  Pure planning rules: schema, budget, timeline, vendors, refine, validation
    ai/                    JsonGenerator interface, Gemini client, prompts, planner (rules + AI)
    server/                Rate limiter, LRU cache, JSON body reader
    client/                Form draft parsing, API calls, formatting, localStorage
tests/                     bun test suites
```

## Assumptions

- Budget split weights and per-guest floors are rough market figures, mainly from Indian wedding and party costs, with USD, EUR and GBP floors set to match. They are a starting point, not a quote.
- Lead times are typical for a mid-sized city. Popular vendors in peak season may need more.
- Plans and checklist ticks are saved in the browser's localStorage; there are no accounts.
- The rate limiter and cache are in memory, so on serverless hosting they apply per instance. A shared store such as Redis would be the next step for a real launch.
