# Claude Review: Re-derive AI Summary path

Task: `coop-20260514-121744-ais`
Phase: `claude_review` (read-only)
Reviewer: `deployment-reviewer`
Plan under review: `.cooperations/evidence/coop-20260514-121744-ais/plan.md`

## Verdict

`review_check: approve`

The plan is tightly scoped, every proposed behavior traces to `specs/ai-features.md § Summary`, demo-mode parity is preserved, and the file list does not leak into draft/priority/UI/schema/env territory. Two low-severity notes below for the implementer; neither blocks approval.

## Check matrix

| # | Check | Outcome | One-liner |
|---|---|---|---|
| 1 | plan-vs-spec drift | pass | All three semantic elements (sender intent, action requested, deadline-if-present) are the exact tuple in `specs/ai-features.md § Summary` line 5. No new behavior asserted beyond that line. |
| 2 | demo-mode parity | pass | A2 requires the fallback to succeed for every demo message with `ANTHROPIC_API_KEY` unset; no new required env vars; `.env.example` is in the explicit "not touched" list. |
| 3 | security-token-handling | pass | A7 forbids logging of `ANTHROPIC_API_KEY`, prompt body, or raw response; R3/R6/R7 reinforce. Plan also instructs implementer to not add any new `console.*` in `src/server/ai/*` or `src/app/api/ai/*`. |
| 4 | AI-email-triage parity invariants | pass | Wire shape `{ summary: string }` is locked at A1; "Non-goals" line 36 forbids shape change; A6 forbids any send/reply/forward call from the route; A4 keeps fallback deterministic (no `Date.now()`-style nondeterminism in the new helpers). |
| 5 | provider-adapter discipline | pass | A5 explicitly forbids any `MailProviderAdapter` import inside `src/server/ai/*` or `src/app/api/ai/summary/route.ts`; reads remain via `getMessage` from `src/server/db/repository.ts`; the new `summary-fallback.ts` is declared pure (no I/O, no env reads). |
| 6 | scope hygiene | pass | File list is bounded to `src/server/ai/anthropic.ts`, `src/server/ai/summary-fallback.ts` (new), `src/server/ai/anthropic.test.ts` (new), `src/app/api/ai/summary/route.ts`, and conditionally `src/server/ai/priority.ts` + `src/server/ai/language-signals.ts`. `MailApp.tsx`, draft route, prioritize route, `schema.sql`, `.env.example`, and `tests/e2e/inbox.spec.ts` are explicitly out. |
| 7 | test plan adequacy | pass | Vitest unit coverage for `buildFallbackSummary` (deadline / action-no-deadline / digest cases) is named in A8. `npm run check` is the named gate (A9). Playwright omission justified (no UI change). |
| 8 | vercel.json / env coverage | n/a | No deploy surface or env touched; `.env.example` is explicitly excluded; `vercel.json`, `next.config.mjs` are not in scope. Confirmed no implicit env reads added (R5 keeps the `!process.env.ANTHROPIC_API_KEY` guard as the first statement). |

## Spec-line trace

- Plan § Summary (line 10) → `specs/ai-features.md` line 5 ("sender intent, action requested, and deadline if present").
- Plan § Goal 4, A2, A4 → `specs/product.md` line 27 ("Demo mode works without provider credentials") and `.claude/rules/demo-mode-parity.md`.
- Plan § A5, A6 → `specs/email-adapters.md § Operations` (route does not invoke `send`/`reply`/`forward`/`getMessage` against an adapter directly) and `specs/product.md` line 30 ("AI drafts are review-only and never auto-send" — applied to summary by analogy).
- Plan § A7, R3, R6, R7 → CLAUDE.md § Safety ("Never log OAuth tokens, IMAP passwords, Anthropic API keys, model identifiers, or raw message bodies").
- Plan § A3 → `specs/ai-features.md` line 5, mirrored on the network path.
- Plan § Privacy (implicit) → `specs/ai-features.md` line 16 ("Only the selected message content is sent to the AI provider for summary/draft"); the route already gates on a single `messageId` and the plan does not change that.

## Notes for the implementer (non-blocking)

### [low] One-and-only-one detection-helper home

**File**: plan step 1–2, `src/server/ai/summary-fallback.ts` / `src/server/ai/language-signals.ts`
**Issue**: The plan offers two paths: (a) extract `urgentWords`/`actionWords` into `language-signals.ts` and re-import from both `priority.ts` and `summary-fallback.ts`, or (b) duplicate the small arrays. Either is acceptable, but the implement evidence must state which path was taken and, in case (a), include a one-line proof that `priority.test.ts` ran unchanged (R4).
**Fix**: In the implement-phase result document, name the path chosen and include the `priority.test.ts` run result.

### [low] zod-error 400 vs. summarize-error 500 branching

**File**: plan step 4, `src/app/api/ai/summary/route.ts`
**Issue**: The plan permits the implementer to either split the try/catch or keep a single try/catch and branch on `error instanceof z.ZodError`. The draft route at `src/app/api/ai/draft/route.ts` currently uses a single try/catch with `apiError(error, 400)` and does not distinguish 400 vs. 500. Either is fine, but if the implementer chooses to split, the diff should not regress draft-route style. Tightening the summary route's status code mapping is a hardening edit, not a contract change, and stays within the spec.
**Fix**: Implementer's call; whichever is chosen, the route must still return `{ summary }` on the 2xx path and a stable JSON error shape on the 4xx/5xx paths.

## Implement-phase watchlist (for `claude_final`)

The reviewer will re-check these at `claude_final`:

1. No new `console.*` calls in `src/server/ai/anthropic.ts`, `src/server/ai/summary-fallback.ts`, `src/server/ai/language-signals.ts` (if created), or `src/app/api/ai/summary/route.ts`. No prompt or response body logged anywhere.
2. Response on `POST /api/ai/summary` remains exactly `{ summary: string }` — no extra fields, no nested object, no echo of `messageId` or `model`.
3. `summarizeMessage` first statement still guards on `!process.env.ANTHROPIC_API_KEY` and returns the fallback string. No `ANTHROPIC_API_KEY` read on any hot path other than this guard plus the existing `callAnthropic` header.
4. No import of `MailProviderAdapter` or any adapter instance under `src/server/ai/*` or `src/app/api/ai/summary/*`. The route still reads via `getMessage` from `src/server/db/repository.ts`.
5. No edits outside the plan's file list. In particular: `src/components/MailApp.tsx`, `src/server/db/schema.sql`, `src/lib/types.ts`, `.env.example`, `src/app/api/ai/draft/route.ts`, `src/app/api/ai/prioritize/route.ts`, and `tests/e2e/inbox.spec.ts` must be unchanged.
6. `npm run check` green; `priority.test.ts` passes unchanged; new `anthropic.test.ts` (or equivalent name targeting `summary-fallback.ts`) covers the deadline / action-no-deadline / digest cases named in plan step 5.

## Next gate

`/checkpoint review_check approve` → `implement` (ai-features). No `plan_refine` round needed.

review ready: .cooperations/evidence/coop-20260514-121744-ais/claude-review.md
