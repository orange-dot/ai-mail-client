# Test report: Re-derive AI Summary path Claude-driven

Task: `coop-20260514-121744-ais`
Phase: `test` (sandbox: read-only on `src/`; may write under `tests/` and `.cooperations/evidence/<task-id>/`)
Test-runner role: `test-runner`
Plan: `.cooperations/evidence/coop-20260514-121744-ais/plan.md`
Review: `.cooperations/evidence/coop-20260514-121744-ais/claude-review.md`
Implement: `.cooperations/evidence/coop-20260514-121744-ais/implement.md`
Handoff in: `.cooperations/handoffs/coop-20260514-121744-ais-004.json`

## Commands run

| Command | Exit code | Result |
|---|---|---|
| `npm run check` (composite: `lint && typecheck && test`) | 0 | green |

Per the latest handoff and the plan § Test plan, `npm run test:e2e` is **not required** for this cooperation: the UI is unchanged and `tests/e2e/inbox.spec.ts` does not exercise the summary path. It was therefore not run. `npm run check` shows no symptoms that would warrant running heavy proof anyway.

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

 ✓ src/server/ai/priority.test.ts (2 tests) 12ms
 ✓ src/server/ai/anthropic.test.ts (3 tests) 16ms
 ✓ src/server/mail/adapters/normalization.test.ts (2 tests) 15ms
 ✓ src/lib/mail-filters.test.ts (3 tests) 22ms
 ✓ src/server/security/crypto.test.ts (2 tests) 29ms
 ✓ src/server/mail/mime.test.ts (2 tests) 10ms

 Test Files  6 passed (6)
      Tests  14 passed (14)
   Start at  14:40:53
   Duration  2.42s
```

## Lint / typecheck

- `eslint .` — pass (no output, exit 0).
- `tsc --noEmit` — pass (no output, exit 0).

## Unit suite

- **6 test files discovered, 6 passed, 0 failed.**
- **14 tests run, 14 passed, 0 failed, 0 skipped, 0 flaky.**

### Required confirmations

- `src/server/ai/anthropic.test.ts` — **discovered and passed.** 3/3 cases green:
  1. `buildFallbackSummary > surfaces a deadline phrase when the body has one` — passed. Asserts the summary contains the sender ("Alex Doe") and surfaces "15:00" from `bodyText` "Please review before 15:00." despite the subject also containing "deadline today" — verifying the tuning note in implement § "Deadline-detector tuning note".
  2. `buildFallbackSummary > mentions the action verb when no deadline is present` — passed. Asserts the summary contains the sender ("Sam Reviewer") and mentions "confirm", and does **not** emit a `deadline:` phrase.
  3. `buildFallbackSummary > still produces a non-empty summary for a digest with no action or deadline` — passed. Asserts non-empty, contains the sender ("Newsletter Bot"), and does **not** emit a `deadline:` phrase. (Plan § Implementation steps step 5 cases all covered.)

- `src/server/ai/priority.test.ts` — **discovered and passed unchanged.** 2/2 cases green. `git status --short` shows the file is not in the working tree diff (not modified, not staged, not new). This corroborates the implementer's choice of Path B (duplicate the small word arrays in `summary-fallback.ts` rather than extract into `language-signals.ts`), per implement evidence § "Helper-housing path chosen" and plan § R4 mitigation.

### Other suites

- `src/server/mail/adapters/normalization.test.ts` — 2/2 pass.
- `src/lib/mail-filters.test.ts` — 3/3 pass.
- `src/server/security/crypto.test.ts` — 2/2 pass.
- `src/server/mail/mime.test.ts` — 2/2 pass.

## Failing tests

None.

## Flaky / skipped tests

None. Single-run vitest, zero retries used, zero `.skip` / `.todo` encountered.

## Coverage delta

- Added: `src/server/ai/anthropic.test.ts` (3 new vitest cases covering `buildFallbackSummary`).
- No tests removed.
- No tests under `tests/` added or modified by the test-runner phase (none were needed; the implement-phase unit test already meets plan A8).

## Watchlist parity spot-check (read-only sanity)

These are observations from `git status` and the implement evidence, not new verification. They are recorded here so claude_final does not have to re-derive them.

- Working tree diff is bounded to the four planned files plus cooperation tracking (`.cooperations/handoffs/*`, `.cooperations/tasks.json`, `.claude/settings.json`). No `src/components/MailApp.tsx`, no `src/lib/types.ts`, no `src/server/db/*`, no `src/server/ai/priority.ts`, no `.env.example`, no `tests/e2e/*` change.
- `src/server/ai/priority.ts` and `src/server/ai/priority.test.ts` are absent from the working-tree diff, satisfying plan A4 / R4 mitigation ("`priority.test.ts` must pass unchanged").

## Verdict

**green** — hand off to `claude_final` (deployment-reviewer).

Next gate: `/handoff reviewer` → `claude_final` phase.

test ready: .cooperations/evidence/coop-20260514-121744-ais/test-report.md
