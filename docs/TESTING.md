# Testing

```bash
bun run check   # tsc --noEmit, eslint, prettier --check, bun test (also runs in GitHub Actions on every push)
bun test        # 65 tests, 153 assertions, 12 files, about 1 s
```

Tests use `bun test`, with `happy-dom` (preloaded through `bunfig.toml` and `tests/dom.ts`) and `@testing-library/react` for components. No test calls the network: Gemini is replaced by a fake `JsonGenerator` or a fake `@google/genai` client.

## What is covered

| File | Area | Checks |
|---|---|---|
| `tests/budget.test.ts` | Budget rules | Lines add up to the exact total; 10% buffer, 15% under a month; tight budget warning with a suggested guest count; split weights stay normalised; home turns venue into rentals |
| `tests/timeline.test.ts` | Timeline and vendors | Counts back from the event date; late tasks move to today with a fallback; "due now" within a week; sorted by date; tasks for the event's needs; no permits for a community event at home; staff sized to guests; coordinator only for big events; book-by never in the past and `late` flag set; home swaps in a rental supplier; outdoor canopy and accessible transport; lead times per event type |
| `tests/validation.test.ts` | Dates and form | Timezone-safe day math across month ends and leap days; rejects past, far-future and fake dates; one day of timezone slack; grouped numbers like `15,00,000`; readable field errors |
| `tests/refine.test.ts` | Plain-language changes | Valid changes applied; a past date skipped while other changes stay; out-of-range values rejected; a valid change kept when another is out of range, with "Skipped: ..." in the reply |
| `tests/planner.test.ts` | Rules plus AI | Rules only without AI; AI ideas and tasks merged without changing the budget; fallback on bad JSON, wrong shape or errors; refine output turned into a checked input; AI task ids stable across redrafts |
| `tests/gemini.test.ts` | Model fallback chain | Next model on 503; stops at once on 400; last error when all fail; empty reply counts as a miss |
| `tests/server.test.ts` | Server helpers | Rate limiter blocks and resets, and caps tracked clients; LRU eviction order; `readJson` rejects wrong content type, oversize, bad JSON and bad shape |
| `tests/plan-request.test.ts` | Shared route checks | Valid request passes through; 429 with the route's message after the limit; skewed device date and an event over 3 years away rejected with a field message |
| `tests/client.test.ts` | Client helpers | Abort errors recognised; a safe message for any thrown value; form messages quote the same limits as the schema; grouped numbers; money formatting per currency |
| `tests/api.test.ts` | Route handlers end to end | `/api/plan`: rules plan without AI, past date 400 with field path, skewed device date 400, request 21 in a minute gets 429. `/api/refine`: 503 without AI, past date 400, success returns new plan with AI task ids, no change returns `plan: null`, invalid model reply returns 502 |
| `tests/intake-form.test.tsx` | Form component | Every input has an accessible name; errors linked with `aria-describedby`; change and submit events |
| `tests/plan-sheet.test.tsx` | Plan component | Each section under its own heading; late and "for you" labels; vendor checkboxes toggle; a stale plan says so and hides Gemini's extras |

Shared test data lives in `tests/fixtures.ts`.

## Manual checks done

- Playwright run on the built app: draft a plan, focus moves to the plan title, tick a vendor, reload, tick is kept.
- axe-core 4.10 (WCAG 2.1 A and AA rules) on the live site: 0 violations, before and after an invalid submit.
- Live API: past event date on `/api/refine` returns `400 Event date is already in the past.`
