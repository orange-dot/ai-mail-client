---
description: Invoke spec-drift-guard skill across the repository. Reports any divergence between src/ and specs/.
argument-hint: [path]
---

# /spec-check

Walk the spec-drift-guard skill (`.claude/skills/spec-drift-guard/SKILL.md`) over the codebase and report findings.

## Steps

1. Default scope: every path listed in the spec-drift-guard skill's signal table.
2. If `$ARGUMENTS` is a path or glob, scope to that subset only.
3. For each touched path, apply the signal rules:
   - Compare `src/server/mail/adapters/types.ts` against `specs/email-adapters.md`.
   - Compare each adapter implementation against the spec's normalization section.
   - Compare `src/server/ai/anthropic.ts` and `src/server/ai/priority.ts` against `specs/ai-features.md`.
   - Compare AI API routes against `specs/ai-features.md`.
   - Compare mail API routes against `specs/email-adapters.md` (no SDK imports outside adapters).
   - Compare `src/components/MailApp.tsx` against `specs/product.md` (UX surface intact, inbox first, etc.).
4. For each potential drift, emit a finding. Use the verdict shape from the skill.

## Output

```
## Drift findings
### [src/server/ai/anthropic.ts:LL] vs specs/ai-features.md §Summary
- <description>
- suggested fix: <update spec | update code | both>

## Verdict
- clean | drift-warn | drift-block
```

If clean, output exactly:

```
spec-drift-guard: clean
```

## Refusal

- `$ARGUMENTS` is a path that doesn't exist → reject.
- Specs missing (any of `specs/product.md`, `specs/email-adapters.md`, `specs/ai-features.md`) → reject with the missing spec name.
