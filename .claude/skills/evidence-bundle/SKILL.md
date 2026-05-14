---
name: evidence-bundle
description: At the end of a cooperation, gather sources (touched specs + commits + plan artifacts), outputs (logs, test reports, lint), and health checks into .cooperations/evidence/<task-id>/. Mirrors lab_tools/evidence.py EvidenceBundle.
---

# evidence-bundle

Source of truth: `lab_tools/evidence.py` design.

## When to invoke

- After `/checkpoint final_check approve`. The cooperation ends; the bundle freezes its trail.
- Manually if a cooperation halts at `stop` and the user wants the partial trail preserved.

## Bundle layout

```
.cooperations/evidence/<task-id>/
├── plan.md                         (architect, plan phase)
├── claude-review.md                (reviewer, claude_review phase)
├── refined-plan.md                 (architect, plan_refine — optional)
├── implementation-result.md        (implementer)
├── test-report.md                  (test-runner)
├── claude-final-critique.md        (reviewer, claude_final phase)
├── sources.json                    (this skill writes it)
├── outputs/                        (this skill copies into it)
│   ├── lint.txt
│   ├── typecheck.txt
│   ├── vitest.txt
│   └── playwright-summary.txt
└── health.json                     (this skill writes it)
```

## sources.json shape

```json
{
  "task_id": "coop-...",
  "specs_touched": ["specs/ai-features.md"],
  "src_touched": ["src/server/ai/anthropic.ts", "src/app/api/ai/summary/route.ts"],
  "tests_touched": ["src/server/ai/priority.test.ts"],
  "commits": [
    {"sha": "abc1234", "subject": "ai-features: regenerate Anthropic summary path"}
  ]
}
```

Derived via `git diff main..dev --name-only` filtered by category and `git log main..dev --pretty=format:%h|%s`.

## health.json shape

```json
{
  "npm_run_lint": "green",
  "npm_run_typecheck": "green",
  "npm_run_test": "green",
  "npm_run_check": "green",
  "npm_run_test_e2e": "green",
  "npm_audit_omit_dev": "0 vulnerabilities",
  "specs_drift_guard": "clean",
  "no_secret_commit": "clean"
}
```

Any `red` value means the bundle is a *failure record*, not a success record — `final_check` should not have approved.

## Anti-patterns

- Building the bundle before `final_check approve`. It captures stale state.
- Including `.env.local`, `node_modules/`, or `.next/` in the bundle.
- Skipping the bundle "to save space". It is the project's audit trail.
