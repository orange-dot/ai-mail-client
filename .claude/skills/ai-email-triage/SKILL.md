---
name: ai-email-triage
description: Apply when changing AI summary, draft, or priority behavior. Keeps Anthropic-path output and deterministic-fallback-path output structurally identical so the UI cannot tell them apart. Triggers on edits to src/server/ai/, src/app/api/ai/.
---

# ai-email-triage

Source of truth: `specs/ai-features.md`.

## When to invoke

- A cooperation plan changes summary tone, draft tone, priority scoring, or any AI-emitted field shape.
- The Anthropic call path changes (model, parameters, system prompt).
- The deterministic-fallback path changes.

## Invariants

1. **Summary** returns concise sender-intent + deadline statement.
2. **Reply draft** is review-only. The API route MUST NOT call any send/reply/forward method on `MailProviderAdapter`. It returns a draft for the compose sheet.
3. **Priority** values are exactly `urgent`, `high`, `normal`, `low`. No silent extension.
4. **Output parity**: the response shape is identical regardless of whether Anthropic was called or the fallback ran. The UI must not need to branch on which path produced the result.
5. **Demo mode**: when `ANTHROPIC_API_KEY` is unset OR `DEMO_MODE=true`, the deterministic path runs. The app must remain usable without an Anthropic key.
6. **Secrets**: `ANTHROPIC_API_KEY` is server-only. Never echo it back, never include it in logs, never expose the model identifier to the client unless the spec says to.

## Checklist

- [ ] Both paths (real Anthropic + deterministic fallback) updated.
- [ ] `src/server/ai/priority.test.ts` exercises the new behavior.
- [ ] No new direct provider adapter calls from `src/server/ai/*` or `src/app/api/ai/*`.
- [ ] `ANTHROPIC_MODEL` env handling unchanged (default lives in `.env.example`).
- [ ] Response JSON shape verified identical between paths.

## Anti-patterns

- Returning different field names depending on whether the fallback ran.
- Logging the prompt or response body in production routes.
- Routing AI output directly into a send action.
- Treating priority as a free-form string.
