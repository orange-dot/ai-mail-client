# Plan: Re-derive AI Summary path Claude-driven

Task: `coop-20260514-121744-ais`
Phase: `plan` (read-only)
Author role: `architect` (product-planner)
Planned implementer: `ai-features`

## Summary

Re-derive the AI Summary code path on `dev` so that both the Anthropic-backed branch and the deterministic fallback branch produce a summary that explicitly covers the three semantic elements the spec mandates (sender intent, action requested, deadline-if-present), while preserving the existing wire shape (`{ summary: string }`) and demo-mode parity.

## Spec references

- `specs/product.md` § Required Capabilities — "AI summary, AI reply draft, and AI priority scoring." Summary is a first-class capability.
- `specs/product.md` § Acceptance Criteria — "Demo mode works without provider credentials." and "AI drafts are review-only and never auto-send." Summary, like draft, must never trigger a send.
- `specs/ai-features.md` § Summary — "Generate a concise message summary with sender intent, action requested, and deadline if present." This is the contract the re-derivation must satisfy on *both* paths.
- `specs/ai-features.md` § Privacy — "Only the selected message content is sent to the AI provider for summary/draft." The route already gates on a single `messageId`; we must keep it that way (no batching, no thread fan-out).
- `specs/email-adapters.md` § Operations — Summary consumes a normalized `EmailMessage` produced by an adapter. The plan must not introduce a direct provider call from `src/server/ai/*` or `src/app/api/ai/summary/*`.
- `.claude/skills/ai-email-triage/SKILL.md` § Invariants 1, 4, 5, 6 — concise sender-intent + deadline statement; output parity between paths; demo-mode keeps working without `ANTHROPIC_API_KEY`; secrets never leave the server.
- `.claude/rules/demo-mode-parity.md` — `DEMO_MODE=true` without an Anthropic key must always work; new env vars are out of scope here.
- `.claude/rules/specs-first.md` — no scope expansion beyond what `specs/ai-features.md` § Summary authorizes.

## Goal & non-goals

### Goal

1. The Summary route consistently produces a summary string that names sender intent, the action requested, and any deadline detected, on both the Anthropic path and the fallback path.
2. The two paths remain JSON-shape-identical at the route boundary (`{ summary: string }`).
3. The fallback path is deterministic (no time-based randomness beyond `receivedAt` already in the message) so it is unit-testable without network or clock mocking.
4. Demo mode keeps working unchanged: no new required env vars, no new secrets, no real provider calls.
5. Centralize the deadline / action-language detection helpers that already exist informally in `priority.ts` so summary and priority share one source of truth for "action / deadline language" extraction.

### Non-goals (deferred)

- Changing the Reply Draft or Prioritize paths beyond *consuming* the shared detection helpers if extracted. No behavioral change to draft/priority outputs.
- Changing the wire shape from `{ summary: string }` to a structured object. The UI in `src/components/MailApp.tsx` reads `payload.summary` as a string; altering it is a separate cooperation with a spec edit.
- Adding model selection, streaming, retries, or token accounting on the Anthropic call.
- Persisting structured summary fields (e.g. extracted deadline) to Postgres. The `ai_summary TEXT` column stays.
- Real-mode-only error paths (out of scope per `.claude/rules/demo-mode-parity.md`).
- Any UI changes in `src/components/MailApp.tsx`.

## Acceptance criteria

A1. **Output parity invariant.** A `POST /api/ai/summary` with a valid `messageId` returns `{ summary: string }` with `summary` non-empty and length > 0, regardless of whether `ANTHROPIC_API_KEY` is set. The JSON keys and value types are identical on both paths. (`specs/ai-features.md` § Summary; ai-email-triage invariant 4.)

A2. **Demo-mode parity.** With `DEMO_MODE=true` and `ANTHROPIC_API_KEY` unset, the summary endpoint succeeds for every message in `src/lib/demo-data.ts` and returns a summary string that includes (a) the sender display or email, and (b) at least one of `{action verb, deadline phrase}` when present in the message body. (`.claude/rules/demo-mode-parity.md`; ai-email-triage invariant 5.)

A3. **Three-element coverage on Anthropic path.** When `ANTHROPIC_API_KEY` is set, the prompt sent to Anthropic instructs the model to cover sender intent, action requested, and deadline-if-present. (`specs/ai-features.md` § Summary.)

A4. **Three-element coverage on fallback path.** The deterministic fallback constructs a summary string assembled from (a) sender intent (derived from subject + sender name/email), (b) action requested (detected via the same action-word list used by priority), and (c) deadline-if-present (detected via the same urgency/deadline-word list and an explicit date/time pattern if present in `bodyText` or `snippet`). When no action and no deadline are detected, it falls back to the current snippet-based form. (`specs/ai-features.md` § Summary; ai-email-triage invariant 1.)

A5. **No new provider calls from AI layer.** No new import of `MailProviderAdapter` or adapter instances inside `src/server/ai/*` or `src/app/api/ai/summary/route.ts`. The route continues to read via `getMessage` from `src/server/db/repository.ts`. (`specs/email-adapters.md`; ai-email-triage anti-pattern.)

A6. **No send side effects.** The route does not call `send`, `reply`, `forward`, or any adapter operation. It only reads via `getMessage` and writes via `patchMessage` to persist `aiSummary`. (`specs/product.md` § Acceptance Criteria; ai-email-triage invariant 2 applied to summary.)

A7. **No secret leakage.** `ANTHROPIC_API_KEY`, the prompt body, and the raw response body are not logged on success or error. Error responses go through `apiError(error, status)` and surface only an `Error.message`. (CLAUDE.md § Safety; ai-email-triage invariant 6.)

A8. **Tests added and green.** A new `src/server/ai/anthropic.test.ts` exercises the fallback summary path against representative demo messages and asserts: result is a non-empty string, mentions the sender, and surfaces the deadline phrase when one exists in `bodyText`. The existing `priority.test.ts` continues to pass unchanged (or with mechanical updates if a helper is extracted).

A9. **`npm run check` green.** Lint, type-check, and unit suite pass. (See Test Plan.)

A10. **No spec edit required.** The behavior above is authorized by `specs/ai-features.md` § Summary as written. If during implement a behavior turns out to need a spec line that does not exist, the implementer must stop and re-open the plan (per `specs-first`).

## Files to modify

New vs. modified, with one-line reason each. Paths are repo-relative.

- `src/server/ai/anthropic.ts` — **modify**. Tighten the Anthropic prompt to explicitly request sender intent + action requested + deadline-if-present. Replace `fallbackSummary(message)` with a richer deterministic implementation that calls a new local helper to detect action/deadline language. Keep return type `Promise<string>`. Keep `callAnthropic` and `ANTHROPIC_MODEL` handling unchanged. Do not log prompt or response.
- `src/server/ai/summary-fallback.ts` — **new**. Single-purpose module exporting `buildFallbackSummary(message: EmailMessage): string` and the small detection helpers (`detectAction`, `detectDeadline`). Pure functions, no I/O, no env reads. This is what makes the fallback unit-testable and what `anthropic.ts` calls in the no-key branch. Keeping it in its own file avoids growing `anthropic.ts` and keeps the network path uncluttered.
- `src/server/ai/anthropic.test.ts` — **new**. Vitest unit tests for `fallbackSummary` (via the new module). Covers: demo message with deadline ("before 15:00"), demo message with an action verb but no deadline, demo message that is a digest with neither. Asserts string non-empty, contains sender, contains deadline phrase when present. No network.
- `src/app/api/ai/summary/route.ts` — **modify, minimal**. Behavior unchanged at the route boundary. Two small hardening edits: (a) validate input with a `zod` schema matching `{ messageId: string }` (mirrors `draft/route.ts`), returning a 400 on bad input instead of crashing in the try/catch; (b) treat any thrown error from `summarizeMessage` as a 500 via `apiError(error, 500)` instead of 400, since by that point the input was valid. No change to response shape. No `aiSummary` shape change persisted via `patchMessage`.
- `src/server/ai/priority.ts` — **modify only if helpers are extracted**. If `summary-fallback.ts` reuses the `urgentWords` / `actionWords` arrays, they move to a tiny shared module (e.g. `src/server/ai/language-signals.ts`) and `priority.ts` imports them. Behavioral output of `scorePriority` is byte-identical. If the duplication cost is judged lower than the refactor cost during implement, `priority.ts` may stay unchanged and `summary-fallback.ts` duplicates the small constant arrays — implementer's call, but it must be one of the two and documented in the implement evidence.
- `src/server/ai/language-signals.ts` — **new, conditional**. Only created if the implementer takes the extract-shared-helpers path above. Exports the `urgentWords` and `actionWords` arrays and a `detectDeadlinePhrase(text: string): string | null` helper. Pure.

Files explicitly **not** touched in this cooperation:

- `src/lib/types.ts` — wire shape unchanged; `aiSummary?: string` stays.
- `src/components/MailApp.tsx` — UI unchanged; it reads `payload.summary` as a string.
- `src/server/db/repository.ts`, `src/server/db/schema.sql` — `ai_summary TEXT` unchanged.
- `src/app/api/ai/draft/route.ts`, `src/app/api/ai/prioritize/route.ts` — not in scope.
- `specs/ai-features.md` and other specs — no edits.
- `.env.example` — no new env vars.
- `tests/e2e/inbox.spec.ts` — e2e flow does not currently exercise summary; not extended here.

## Implementation steps

1. Create `src/server/ai/summary-fallback.ts` with pure helpers: `detectAction(text)`, `detectDeadline(text)`, and `buildFallbackSummary(message)`. The detection helpers consume lowercased text and return either the matched phrase (verbatim, trimmed) or `null`. `buildFallbackSummary` composes the final string in the shape: `"<sender> is asking to <action>"`, plus `" by <deadline>"` when present, plus a trailing `" — <snippet first clause>"` to keep it human-readable when no action is detected. Final string is trimmed and capped at ~240 chars.
2. (Optional) Extract shared word arrays into `src/server/ai/language-signals.ts` and re-import from both `priority.ts` and `summary-fallback.ts`. Verify `priority.test.ts` still passes unchanged.
3. Edit `src/server/ai/anthropic.ts`:
   - Update the summary prompt string to: `"Summarize this email in one or two concise sentences. Identify the sender's intent, the specific action requested, and any deadline. If no action or deadline is present, say so briefly."` plus the existing subject/from/body context.
   - Replace the local `fallbackSummary` body with a call to `buildFallbackSummary` from `summary-fallback.ts`.
   - Keep `summarizeMessage` signature and return type identical.
   - Confirm no `console.*` calls reference prompt content or response content.
4. Edit `src/app/api/ai/summary/route.ts`:
   - Import `z` and define `const schema = z.object({ messageId: z.string().min(1) });` matching the draft route style.
   - Parse the body with `schema.parse`. On parse failure, the existing `apiError(error, 400)` path handles it.
   - On any error thrown by `summarizeMessage`, return `apiError(error, 500)` (move it out of the same `try` only if it complicates the diff; otherwise keep one try/catch and switch on `error instanceof z.ZodError` to choose 400 vs 500). Simpler shape preferred.
   - Response unchanged: `NextResponse.json({ summary })`.
5. Add `src/server/ai/anthropic.test.ts`. Use the same vitest patterns as `priority.test.ts`. Build small `EmailMessage` literals (do not import demo data into tests to avoid coupling test fixtures to demo data). Cases:
   - `with deadline` — body contains "Please review before 15:00." → result contains "15:00" or "before 15:00", contains sender.
   - `with action no deadline` — body contains "Can you confirm the address?" → result mentions confirm, contains sender, no time phrase.
   - `digest` — body has no action and no deadline → result still non-empty, falls back to snippet form, contains sender.
6. Run `npm run check` locally (implementer phase). Inspect output for any regression in the priority suite.
7. Manual smoke (implementer phase) in demo mode: `POST /api/ai/summary` with `messageId` for each demo message, assert response JSON matches A1, A2.
8. Hand off to test-runner via `/handoff test-runner` after implement evidence is written.

## Test plan

Owned by test-runner phase, but called out here so the reviewer can verify the plan covers it.

- **Unit (vitest, fast):** `npm run check` invokes the project's unit suite. New `src/server/ai/anthropic.test.ts` cases (A8) plus unchanged `src/server/ai/priority.test.ts`.
- **Route smoke (manual or scripted):** With `DEMO_MODE=true` and `ANTHROPIC_API_KEY` unset, hit `POST /api/ai/summary` with a demo `messageId`. Expect `200` and `{ summary: string }` with `summary.length > 0`. Verifies A1, A2, A5, A6.
- **Negative input:** `POST /api/ai/summary` with `{}` or with `{ messageId: 123 }`. Expect `400` from the `zod` parse failure routed through `apiError`. Verifies A1's shape-strictness expectation at the boundary.
- **Playwright:** Not extended here. `tests/e2e/inbox.spec.ts` currently does not click a "Summarize" affordance. UI is unchanged, so no e2e regression is expected. If reviewer wants e2e coverage for summary, that is a separate cooperation.
- **`/mail-smoke smoke`** at minimum during test phase. `/mail-smoke heavy` is not strictly required because no UI changed, but the reviewer may request it.

## Risks

R1. **Parity drift.** If the Anthropic prompt evolves to ask for structured JSON output, the route would have to parse it and the fallback would have to match — at which point the wire shape `{ summary: string }` is no longer enough. Mitigation: this plan keeps the Anthropic call returning free-form text, and the route does `summary.trim()` before responding. Any move toward structured output requires a spec edit and a new cooperation.

R2. **Spec drift on fallback richness.** The fallback now does more than echo `snippet`. If reviewers read `specs/ai-features.md` § Summary too narrowly ("one sentence summary") and conclude the fallback is over-reaching, this is exactly the kind of contract argument `specs-first` exists for. Mitigation: the spec line authorizes "sender intent, action requested, and deadline if present" — the fallback expresses all three. No silent extension.

R3. **Secret leakage in error paths.** If a misconfigured prompt or a network error is logged via `console.error(err)` and `err.message` happens to contain a portion of the prompt or API key, that is a leak. Mitigation: `apiError` already strips to `error.message` only; the implementer must not add new `console.*` calls inside `anthropic.ts`. The reviewer checks this at `plan_check`.

R4. **Shared-helper refactor scope creep.** Extracting `language-signals.ts` touches `priority.ts`. If the refactor changes the output of `scorePriority` even subtly, the priority test breaks and the AI prioritize route changes behavior — out of scope. Mitigation: the optional refactor must keep `urgentWords` and `actionWords` arrays byte-identical, in the same order, and `priority.test.ts` must pass unchanged. If the implementer is uncertain, duplicate the small arrays and skip the refactor.

R5. **Demo-mode parity regression on logged-out / no-key boot.** A `zod` parse error in the route on bad input is fine, but if the route ever throws because `process.env.ANTHROPIC_API_KEY` is read in a way that fails on `undefined` (it currently isn't), demo mode breaks. Mitigation: `summarizeMessage` already guards on `!process.env.ANTHROPIC_API_KEY` at the top; we preserve that guard as the very first statement.

R6. **Body content in logs.** `summarizeMessage` slices `message.bodyText.slice(0, 6000)` into the prompt. If a new debug `console.log(prompt)` is added during implement and not removed, raw message body lands in production logs. Mitigation: CLAUDE.md § Safety is explicit on this; the reviewer scans the implement diff for any new `console.*` in `src/server/ai/*` or `src/app/api/ai/*`.

R7. **Token / model identifier exposure.** The current code does not echo `ANTHROPIC_MODEL` to the client. Implementer must not start. Mitigation: route response stays `{ summary }` only.

## Handoff readiness (what `deployment-reviewer` should check at `plan_check`)

- Plan artifact present at `.cooperations/evidence/coop-20260514-121744-ais/plan.md`. ✓
- File list is bounded; no files outside `src/server/ai/`, `src/app/api/ai/summary/`, and tests. ✓ (`src/server/ai/priority.ts` only touched conditionally and only for a constant-array re-export.)
- No spec edit required; spec line for Summary already authorizes the behavior. ✓
- Demo-mode parity preserved: no new required env vars, fallback path always returns a usable string. ✓
- AI-email-triage invariants 1–6 each map to an acceptance criterion above. ✓
- No new provider adapter calls from `src/server/ai/*` or `src/app/api/ai/summary/*`. ✓ (A5)
- Test plan names the suite (`npm run check`) and the new test file. ✓ (A8, A9)
- Risks list calls out parity, secret leakage, scope creep, and logging. ✓
- Next gate: `/checkpoint plan_check approve` → `claude_review` (deployment-reviewer).

plan ready: .cooperations/evidence/coop-20260514-121744-ais/plan.md
