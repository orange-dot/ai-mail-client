# Final Critique: Re-derive AI Summary path Claude-driven

Task: `coop-20260514-121744-ais`
Phase: `claude_final` (read-only)
Reviewer role: `deployment-reviewer`
Consumed: `plan.md`, `claude-review.md`, `implement.md`, `test-report.md`

## Watchlist verification (against actual diff)

The six bullets recorded at `claude_review` time are re-checked here against the real file contents and `git diff`, not just the implementer's evidence.

| # | Watchlist item | Verdict | Evidence |
|---|---|---|---|
| 1 | No new `console.*` calls in `src/server/ai/*` or `src/app/api/ai/*` | **pass** | `grep -rn 'console\.' src/server/ai/ src/app/api/ai/` → no matches. |
| 2 | Route response stays `{ summary: string }` only | **pass** | `src/app/api/ai/summary/route.ts:22` → `return NextResponse.json({ summary });`. No extra fields, no model id, no rationale. |
| 3 | `!process.env.ANTHROPIC_API_KEY` is the first statement of `summarizeMessage` | **pass** | `src/server/ai/anthropic.ts:8` is `if (!process.env.ANTHROPIC_API_KEY) { return buildFallbackSummary(message); }` — first line of the function body. Demo mode never touches the API. |
| 4 | No `MailProviderAdapter` / `mail/adapters` import in `src/server/ai/*` or `src/app/api/ai/summary/*` | **pass** | `grep -rn 'MailProviderAdapter\|mail/adapters' src/server/ai/ src/app/api/ai/summary/` → no matches. The route reads via `getMessage` from `src/server/db/repository.ts` as required. |
| 5 | `src/server/ai/priority.ts` byte-unchanged (helper extraction not taken) | **pass** | `git diff --stat src/server/ai/priority.ts` → empty. Implementer chose the duplicated-arrays path per implement.md; `URGENT_WORDS` and `ACTION_WORDS` live in `summary-fallback.ts` with a comment naming the duplication and its rationale. |
| 6 | `npm run check` green | **pass** | `test-report.md` records lint clean, typecheck clean, vitest 14/14 (3 new fallback cases + 11 prior, including `priority.test.ts` unchanged). |

## Broader audits

### plan-vs-spec drift
**pass.** Every behavior in the final diff traces to `specs/ai-features.md` § Summary line 5 ("sender intent, action requested, and deadline if present"):

- Anthropic prompt at `anthropic.ts:13` literally enumerates "the sender's intent, the specific action requested, and any deadline" → covers all three elements.
- Fallback `buildFallbackSummary` at `summary-fallback.ts:60` composes `${sender} is asking to ${action}` + optional `deadline: ${deadline}` + first-clause tail → covers all three elements with graceful degradation when none are detected.

No retroactive spec edit is required.

### security-token-handling
**pass.** Re-grepped: no `console.*` anywhere in the AI layer. Route surfaces only `error.message` via `apiError(error, status)` (zod errors → 400, anything else → 500 at `route.ts:24-27`). `ANTHROPIC_API_KEY` is read only inside `callAnthropic` and never logged or echoed. `ANTHROPIC_MODEL` stays server-side; route response carries only `summary`.

### demo-mode-parity
**pass.** Three signals confirm this:

1. The guard at `anthropic.ts:8` short-circuits to `buildFallbackSummary` whenever `ANTHROPIC_API_KEY` is unset — covers both `DEMO_MODE=true` and "real mode without a key configured."
2. `buildFallbackSummary` has zero env reads, zero I/O, zero clock dependencies (the only timestamp it touches is the message's own `receivedAt` indirectly through body text). Output is deterministic for a given `EmailMessage`.
3. No new env var added; `.env.example` is unchanged.

### vercel.json / env coverage
**N/A; pass.** No deploy-surface change in this cooperation. No new env var to thread through `next.config.mjs` or `.env.example`.

### scope hygiene
**pass.** Final diff is bounded:
- `src/server/ai/anthropic.ts` (modified)
- `src/server/ai/summary-fallback.ts` (new)
- `src/server/ai/anthropic.test.ts` (new)
- `src/app/api/ai/summary/route.ts` (modified)
- `src/server/ai/priority.ts` — unchanged
- `src/lib/types.ts`, `src/components/MailApp.tsx`, draft/prioritize routes, schema.sql, `.env.example` — all untouched.

## Observations (non-blocking)

- `prioritizeMessages` in `anthropic.ts:39-51` has a real-mode branch that does the same work as the fallback branch (both map via `scorePriority`). This predates the cooperation and is out of scope, but is worth filing as a follow-up: either remove the dead branch or wire a real Anthropic call. Not a blocker.
- `detectAction` returns the bare matched verb (e.g. `"confirm"`, `"review"`). The fallback string reads "is asking to confirm" / "is asking to review" — natural for verb matches, slightly awkward for the multi-word `"can you"` entry (would read "is asking to can you"). The current unit tests don't trigger this combination, but a future test with body text whose earliest action word is `"can you"` could surface it. Cosmetic, not a correctness issue. Suggest a one-line tweak in a later cleanup cooperation.

Neither observation blocks merge.

## Verdict

`final_check: approve`

## Next steps

1. Evidence-bundle should pack:
   - `plan.md`, `claude-review.md`, `implement.md`, `test-report.md`, `claude-final-critique.md` (this file)
   - All five handoffs `coop-20260514-121744-ais-{001..005}.json`
   - Touched source files snapshot (`src/server/ai/anthropic.ts`, `src/server/ai/summary-fallback.ts`, `src/server/ai/anthropic.test.ts`, `src/app/api/ai/summary/route.ts`)
   - `health.json`: `npm run check` green, no UI delta, no env delta
2. User action before merge: review the diff (it's small — 4 files), confirm comfort with the prompt wording at `anthropic.ts:13`, and commit when satisfied. No infra change, no env change, no migration.

final ready: .cooperations/evidence/coop-20260514-121744-ais/claude-final-critique.md
