---
name: smoke-path-mail
description: Canonical smoke path for this project. Mirrors the lab_tools smoke-path contract. `npm run check` is the fast proof; `npm run check && npm run test:e2e` is the heavy proof. Invoked by /mail-smoke and by test-runner.
---

# smoke-path-mail

Source of truth: `package.json` scripts, `lab_tools/smoke.py` design.

## Smoke command

```bash
npm run check
```

Composite of `npm run lint && npm run typecheck && npm test` per the project's `package.json`. Must pass before any handoff out of the implement phase.

## Heavy proof

```bash
npm run check && npm run test:e2e
```

Adds Playwright mobile + desktop projects. Run before `claude_final` for any UI-shaped cooperation. Also run before any deployment-reviewer claude_final.

## Proof level badges (lab_tools-style)

| Badge | Command(s) | When |
|---|---|---|
| `docs-only` | none | Cooperation only touched `docs/`, `specs/`, or `.claude/` artifacts. |
| `smoke` | `npm run check` | Default for any `src/` change. |
| `validation` | `npm run check && npm run test:e2e` | UI cooperations, AI cooperations affecting `/api/ai/*`, any change to the compose path. |
| `env-heavy` | adds `npm run env:check && npm run predeploy` | Deployment-reviewer cooperations only. |

## Artifact patterns

After a run, the following are auto-collected by `evidence-bundle` skill:

- `test-results/` — Vitest unit run output.
- `playwright-report/` — Playwright HTML report.
- `coverage/` — if coverage was requested.
- `.next/` — build cache (excluded from evidence bundle; just confirmed to exist after `npm run build`).

## Failure handling

- Red `npm run check`: hand back to the implementer with the failing test list. Do not advance phase.
- Red Playwright: same. UI flake retry up to twice with `npx playwright test --retries=2`.
- Red `npm audit --omit=dev`: claude_final block. Triage the advisory; usually means a dev dep needs bump.

## Anti-patterns

- Running `npm run build` as the smoke command. It is too slow and does not verify behavior.
- Skipping `npm run check` because "I only changed docs". The hook is harmless on docs-only changes anyway.
- Treating Playwright flakes as silent passes.
