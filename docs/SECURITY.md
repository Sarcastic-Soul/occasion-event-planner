# Security

Each control below names the file that implements it and the test that covers it.

| Risk | Control | Code | Test |
|---|---|---|---|
| API key leak | Key read only from `process.env.GEMINI_API_KEY` on the server; `import "server-only"` makes a client import fail the build; `.env` is git-ignored, `.env.example` has no value | `src/lib/ai/gemini.ts` | build |
| Oversized or malformed bodies | 8 KB limit (checked from `content-length`, then real bytes), `application/json` required, `JSON.parse` in try/catch | `src/lib/server/http.ts` | `tests/server.test.ts` |
| Bad or hostile input | Every body validated with Zod; enums for all choices; integer ranges; text length caps; control characters stripped | `src/lib/plan/schema.ts` | `tests/api.test.ts`, `tests/validation.test.ts` |
| Date tampering | Client `today` must be within 1 day of server date; event date must be real, not past, within 3 years | `src/lib/plan/validation.ts` | `tests/validation.test.ts`, `tests/api.test.ts` |
| Prompt injection via notes or title | User text sent as JSON data; system prompts say to treat it as facts, never instructions; the model can only return a fixed schema | `src/lib/ai/prompts.ts` | - |
| Untrusted model output | Structured JSON output, then `safeParse` with length caps; invalid output falls back to the rule plan (plan) or a 502 (refine) | `src/lib/ai/planner.ts` | `tests/planner.test.ts`, `tests/api.test.ts` |
| Model changing values it should not | Refine can only touch six fields; each is re-checked with the same rules as the form; money and dates in the plan always come from rules | `src/lib/plan/refine.ts` | `tests/refine.test.ts` |
| Abuse and cost | Per-client fixed-window rate limit (20 plans, 10 refines per minute), bounded to 5,000 tracked clients; LRU cache avoids repeat model calls; one 20 s model deadline and route `maxDuration` | `src/lib/server/rate-limit.ts`, `src/app/api/*/route.ts`, `src/lib/ai/gemini.ts` | `tests/server.test.ts`, `tests/api.test.ts`, `tests/gemini.test.ts` |
| XSS | React escapes all output; no `dangerouslySetInnerHTML`; CSP limits scripts, styles, images, fonts and connections to the same origin | `next.config.ts` | - |
| Clickjacking and sniffing | `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy` blocking camera, mic and location; `poweredByHeader: false` | `next.config.ts` | - |
| Corrupt local data | Plans restored from localStorage are re-validated (input schema, array shapes, date not past) before use | `src/components/planner/use-planner.ts` | - |
| Error detail leaks | Errors return short user-facing messages; stack traces and model errors are never sent | `src/app/api/*/route.ts` | `tests/api.test.ts` |
| Caching private data | All API responses `Cache-Control: no-store` | `src/lib/server/http.ts`, routes | - |

No accounts, cookies or personal data are stored on the server.

## Known gaps (left on purpose for a hackathon build)

- The rate limiter is per serverless instance, not global. A shared store such as Upstash Redis would fix this.
- `script-src` keeps `'unsafe-inline'` because Next.js injects inline hydration scripts. A nonce-based CSP through middleware would remove it.
