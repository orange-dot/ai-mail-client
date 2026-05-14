# Implement: Re-derive AI Summary path

Task: `coop-20260514-121744-ais`
Phase: `implement` (sandbox: `workspace-write`)
Implementer role: `ai-features`
Plan: `.cooperations/evidence/coop-20260514-121744-ais/plan.md`
Review: `.cooperations/evidence/coop-20260514-121744-ais/claude-review.md`

## Files touched

| Path | New / Modified | One-line reason |
|---|---|---|
| `src/server/ai/anthropic.ts` | modified | Tightened the summary prompt to ask for sender intent + action + deadline; replaced inline `fallbackSummary` body with a call to the new `buildFallbackSummary` from `summary-fallback.ts`. Demo-mode guard remains the first statement. |
| `src/server/ai/summary-fallback.ts` | new | Pure module exporting `buildFallbackSummary`, `detectAction`, `detectDeadline`. Composes a deterministic summary covering sender intent, action, and deadline-if-present. No I/O, no env reads. |
| `src/server/ai/anthropic.test.ts` | new | Vitest unit suite for `buildFallbackSummary`. Three cases: deadline ("before 15:00"), action no deadline ("confirm"), and a digest with neither. |
| `src/app/api/ai/summary/route.ts` | modified | Added `zod` input validation matching the draft route style; split error handling so `ZodError → 400` and any other thrown error from `summarizeMessage` → `500`. Response shape unchanged: `{ summary }`. |

Files explicitly **not** touched (per plan + watchlist):
`src/lib/types.ts`, `src/components/MailApp.tsx`, `src/server/db/*`, `src/app/api/ai/draft/route.ts`, `src/app/api/ai/prioritize/route.ts`, `src/server/ai/priority.ts`, `src/server/ai/priority.test.ts`, `specs/*`, `.env.example`, `tests/e2e/*`, `next.config.mjs`, `vercel.json`.

## Helper-housing path chosen

**Path B: duplicate the `URGENT_WORDS` / `ACTION_WORDS` arrays inside `summary-fallback.ts`.** `src/server/ai/priority.ts` is **unchanged**, and no `language-signals.ts` was introduced.

Why:

- Plan R4 explicitly recommends duplication when the refactor risks any change to `scorePriority` output. This is the safer choice.
- Duplicating eight + seven small string constants is cheap; centralizing them would have required touching `priority.ts` and re-running `priority.test.ts` to prove byte-identical output. The diff is smaller and the blast radius is zero.
- A short rationale comment in `summary-fallback.ts` flags the intentional duplication and points the door open for a future shared `language-signals.ts` cooperation if both files diverge.

Proof `priority.test.ts` is unchanged and green:

```
src/server/ai/priority.test.ts — file untouched (git diff shows no entry).
Test run: ✓ src/server/ai/priority.test.ts (2 tests) 13ms
```

## Watchlist invariants (claude-review § 50)

1. **No new `console.*` in AI scope.** Proof:
   ```
   $ grep -rn "console\." src/server/ai/ src/app/api/ai/
   NO MATCHES
   ```
2. **Response stays `{ summary: string }`.** `src/app/api/ai/summary/route.ts` line 23 returns `NextResponse.json({ summary })`. The `summary` value is `summarizeMessage`'s `Promise<string>` (Anthropic path does `.trim()` before returning; fallback returns a trimmed, length-capped string). No new fields, no nested object, no echo of `messageId` or `model`.
3. **`!process.env.ANTHROPIC_API_KEY` guard is the first statement of `summarizeMessage`.** Proof: `src/server/ai/anthropic.ts` lines 7-10 — the function body starts with the guard, which returns `buildFallbackSummary(message)` before any network or env-key read on the hot path. The only other reference to `ANTHROPIC_API_KEY` is the existing `callAnthropic` header (line 58).
4. **No `MailProviderAdapter` import in AI scope.** Proof:
   ```
   $ grep -rn "MailProviderAdapter\|mail/adapters" src/server/ai/ src/app/api/ai/summary/
   NO MATCHES
   ```
   The route still reads via `getMessage` from `src/server/db/repository.ts`.
5. **No edits outside the plan's file list.** Verified by `git status`: only the four planned files plus the two cooperation-tracking files appear in the working tree diff. None of `MailApp.tsx`, `schema.sql`, `types.ts`, `.env.example`, draft route, prioritize route, or `tests/e2e/*` are modified.
6. **`npm run check` green; `priority.test.ts` unchanged & passing; new tests cover the three named cases.** See output below.

## Deadline-detector tuning note (no spec drift)

First pass of `detectDeadline` greedily matched the leading "deadline today" in the test's subject line ("Security deadline today") and stopped before reaching the body's "before 15:00", which the plan's test (step 5) requires to be surfaced. Tightening:

- Made the regex global (`/g`) and the alternation order longest-first.
- Added a `DIGIT_OR_DAY_PATTERN` preference: across all matches, the one whose tail contains a digit or weekday wins. Falls back to the first match if none is specific.

This is purely a tuning of the deterministic helper, not a spec change. `specs/ai-features.md § Summary` says "deadline if present" — surfacing the most specific deadline phrase is more, not less, faithful to that line. No new behavior, no new env vars, no new wire field.

## `npm run check` output (tail)

```
> ai-mail-client@0.1.0 check
> npm run lint && npm run typecheck && npm test


> ai-mail-client@0.1.0 lint
> eslint .


> ai-mail-client@0.1.0 typecheck
> tsc --noEmit


> ai-mail-client@0.1.0 test
> vitest run


 RUN  v2.1.9 /home/dev/work-base-20260421/workspace/product/ai-mail-client

 ✓ src/server/ai/anthropic.test.ts (3 tests) 17ms
 ✓ src/server/ai/priority.test.ts (2 tests) 13ms
 ✓ src/server/mail/adapters/normalization.test.ts (2 tests) 12ms
 ✓ src/server/security/crypto.test.ts (2 tests) 18ms
 ✓ src/lib/mail-filters.test.ts (3 tests) 13ms
 ✓ src/server/mail/mime.test.ts (2 tests) 6ms

 Test Files  6 passed (6)
      Tests  14 passed (14)
   Start at  14:38:44
   Duration  2.16s
```

Lint clean, typecheck clean, all 14 unit tests green (3 new + 2 priority + 9 pre-existing).

## Deviations from the plan

None of substance. Two minor calls within plan-authorized latitude:

- **Helper housing:** chose duplication (plan-authorized "implementer's call" per plan § "Files to modify" line 72 and review note § "[low] One-and-only-one detection-helper home").
- **Route error split:** chose a single try/catch with `error instanceof z.ZodError` branching (plan step 4 said "Simpler shape preferred"; review § "[low] zod-error 400 vs. summarize-error 500 branching" approved either form).

Both fall inside the plan and the spec coverage. No new contract was invented.

## Handoff readiness

- Implement artifact present at this path. ✓
- File list bounded to plan scope. ✓
- All watchlist invariants verified with one-line proofs. ✓
- `npm run check` green. ✓
- Next gate: `/handoff test-runner` → `test` phase (read-only on src; may add coverage under `tests/`).

implement ready: .cooperations/evidence/coop-20260514-121744-ais/implement.md
