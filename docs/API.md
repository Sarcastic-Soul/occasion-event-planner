# API

Both endpoints accept `POST` with `Content-Type: application/json`, a body of at most 8 KB, and return JSON with `Cache-Control: no-store`. Request bodies are validated with the Zod schemas in `src/lib/plan/schema.ts`.

## Shared input: `EventInput`

| Field | Type | Rules |
|---|---|---|
| `eventType` | `"wedding" \| "birthday" \| "community"` | required |
| `title` | string | up to 80 chars, control characters removed, default `""` |
| `date` | `YYYY-MM-DD` | real date, not in the past, at most 3 years away |
| `guests` | integer | 1 to 5,000 |
| `budget` | integer | 1 to 1,000,000,000 |
| `currency` | `"INR" \| "USD" \| "EUR" \| "GBP"` | default `"INR"` |
| `setting` | `"indoor" \| "outdoor" \| "home"` | required |
| `considerations` | array of `"accessibility" \| "dietary" \| "kids" \| "elderly" \| "eco"` | default `[]` |
| `notes` | string | up to 500 chars, control characters removed, default `""` |

`today` is the user's local date (`YYYY-MM-DD`). It must be within one day of the server's date, so countdowns match the user's timezone but cannot be faked.

## `POST /api/plan`

Builds the rule-based plan and adds Gemini's ideas, extra tasks, tips and summary.

Request:

```json
{
  "today": "2026-10-21",
  "input": {
    "eventType": "birthday", "title": "Ananya turns 7", "date": "2026-11-20",
    "guests": 25, "budget": 40000, "currency": "INR", "setting": "home",
    "considerations": ["kids"], "notes": "Space theme, she loves rockets and stars"
  }
}
```

Response `200` (`EventPlan`, trimmed):

```json
{
  "input": { "...": "the checked input" },
  "daysLeft": 30,
  "ideasSource": "ai",
  "summary": "A space-themed home party for 25 guests...",
  "budget": {
    "currency": "INR", "total": 40000, "perGuest": 1600, "health": "comfortable", "warnings": [],
    "lines": [{ "id": "venue", "label": "Rentals (chairs, tables, tent)", "amount": 3200, "share": 0.08 }]
  },
  "timeline": [
    { "id": "theme", "title": "Pick the theme and guest list", "dueDate": "2026-10-21", "status": "rushed", "source": "rules" }
  ],
  "vendors": [
    { "id": "baker", "name": "Baker", "why": "Cake for 25; about one slice per guest plus a few spare.", "bookBy": "2026-11-06", "late": false }
  ],
  "ideas": [{ "title": "DIY Cardboard Rocket Ship", "description": "...", "costHint": "low" }],
  "budgetTips": ["..."]
}
```

`ideasSource` is `"rules"` when Gemini is not configured or did not answer properly; the plan is otherwise complete.

## `POST /api/refine`

Changes the plan from a plain-language request. Gemini turns the message into field changes (`guests`, `budget`, `date`, `setting`, `addConsiderations`, `notesToAdd`); each change is checked on its own against the rules above.

Request: the same `today` and `input` as `/api/plan`, plus `"message": "cut the budget by 20% and make it 40 guests"` (3 to 300 chars).

Response `200` (the reply text is written by Gemini, so it varies):

```json
{ "reply": "Budget lowered to 32,000 and guests set to 40.", "plan": { "...": "new EventPlan" } }
```

`plan` is `null` when nothing changed. If some changes break the rules, the valid ones are applied and the reply ends with, for example, `Skipped: date (already in the past).`

## Errors

| Status | When | Body |
|---|---|---|
| 400 | Invalid JSON, schema failure, bad device date, bad event date | `{ "error": "...", "fields": [{ "path": "input.date", "message": "already in the past" }] }` |
| 413 | Body over 8 KB | `{ "error": "Request too large" }` |
| 415 | Not `application/json` | `{ "error": "Expected application/json" }` |
| 429 | Over 20 plans or 10 refines per minute from one client | `{ "error": "Too many plans at once..." }` |
| 502 | `/api/refine` only: Gemini reply missing or invalid | `{ "error": "The AI service did not answer properly..." }` |
| 503 | `/api/refine` only: no `GEMINI_API_KEY` set | `{ "error": "Changing the plan in words needs the AI service..." }` |
