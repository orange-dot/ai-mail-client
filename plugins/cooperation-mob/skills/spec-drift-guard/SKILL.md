---
name: spec-drift-guard
description: Apply during claude_review and claude_final to verify that the diff under src/ stays consistent with specs/. Same logic as the specs-drift-guard.mjs hook, but exposed as a skill the reviewer can invoke explicitly. lab_tools-inspired contract audit.
---

# spec-drift-guard

Source of truth: `specs/product.md`, `specs/email-adapters.md`, `specs/ai-features.md`.

## When to invoke

- Reviewer in claude_review wants to verify a plan does not propose drifting code from spec.
- Reviewer in claude_final wants to verify the diff did not drift in implementation.
- User runs `/spec-check` explicitly.

## Drift signals to check

For each touched file in `src/`:

| Touched path | Spec to compare | Drift signal |
|---|---|---|
| `src/server/mail/adapters/types.ts` | `specs/email-adapters.md` § MailProviderAdapter | New method on the interface not described in spec; removed method still referenced; signature change. |
| `src/server/mail/adapters/{gmail,microsoft,imap}.ts` | `specs/email-adapters.md` § normalization | Provider-specific field leaking; missing normalization for a documented concept. |
| `src/server/ai/anthropic.ts` | `specs/ai-features.md` § summary/draft/priority | Output shape divergence; AI calling a send method; priority value outside the four allowed strings. |
| `src/server/ai/priority.ts` | `specs/ai-features.md` § priority | Priority values outside `urgent\|high\|normal\|low`; scoring removed without spec update. |
| `src/app/api/ai/**` | `specs/ai-features.md` | Route imports a provider adapter directly. |
| `src/app/api/mail/**` | `specs/email-adapters.md` | Route imports a provider SDK directly, bypassing the registry. |
| `src/components/MailApp.tsx` | `specs/product.md` § UX | Landing page added in place of inbox; required UX surface removed (account switcher, search, labels, archive, delete, compose, reply, forward). |

## Acceptable drift

If the user's intent is to *update the spec* in the same cooperation, drift between code and old spec is fine **only if `specs/*` also has staged changes**. The hook reflects this: drift is silenced when the corresponding spec file is co-edited.

## Verdict shape

```
## Drift findings
### [src/path:line] vs specs/file.md §section
- <one-line description of mismatch>
- suggested fix: <update spec | update code | both with reason>

## Verdict
- clean | drift-warn | drift-block
```

`drift-warn` is the default; `drift-block` only when the contract invariants are violated (e.g., AI route calling send).

## Anti-patterns

- Claiming "spec will be updated later" without a co-edit.
- Adding optional fields to `MailProviderAdapter` to avoid touching the spec.
- Renaming priority values without spec update.
