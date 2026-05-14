---
description: Run the canonical smoke path for this project (npm run check). Optionally heavy proof (npm run test:e2e). Captures outputs to .cooperations/evidence/<task-id>/outputs/ when a cooperation is active.
argument-hint: [smoke | heavy]
---

# /mail-smoke

Run the smoke path defined in `.claude/skills/smoke-path-mail/SKILL.md`.

## Steps

1. Parse `$ARGUMENTS`. Default is `smoke`. Allowed: `smoke`, `heavy`.
2. If a cooperation is active (`status: in_progress` in `.cooperations/tasks.json`), prepare the output directory: `.cooperations/evidence/<task-id>/outputs/`.
3. Run the commands:
   - `smoke`:
     ```bash
     npm run check
     ```
   - `heavy`:
     ```bash
     npm run check
     npm run test:e2e
     ```
4. Tee stdout/stderr to:
   - `outputs/lint.txt`, `outputs/typecheck.txt`, `outputs/vitest.txt` for the `check` sub-commands.
   - `outputs/playwright-summary.txt` for `test:e2e`.
   (If `npm run check` is composite, split via its stages; otherwise dump combined log to `outputs/check.txt` and proceed.)
5. Print one line per stage: `[smoke] <stage> <green|red> (<duration>)`.

## Output

```
[smoke] proof=<smoke|heavy> task=<task-id or "—">
- npm run lint        — green
- npm run typecheck   — green
- npm run test        — green
- npm run check       — green
[heavy only]
- npm run test:e2e    — green

Verdict: <green|red>
```

## Refusal

- `$ARGUMENTS` not `smoke` or `heavy` → reject.
- `package.json` script missing → reject with the script name.
