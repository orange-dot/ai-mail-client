# .cooperations/

Runtime state for the cooperation mob workflow.

Mirrors the on-disk model of `workspace/platform/cooperations/` and the phase pipeline from `lab_tools/runner_pipeline.py`.

## Layout

```
.cooperations/
├── tasks.json              # append-only task ledger (committed)
├── handoffs/               # one JSON per role transition (committed)
│   └── <task-id>-<NNN>.json
├── evidence/               # per-task phase artifacts + outputs (not committed)
│   └── <task-id>/
│       ├── plan.md
│       ├── claude-review.md
│       ├── refined-plan.md          (optional)
│       ├── implementation-result.md
│       ├── test-report.md
│       ├── claude-final-critique.md
│       ├── sources.json
│       ├── outputs/
│       │   ├── lint.txt
│       │   ├── typecheck.txt
│       │   ├── vitest.txt
│       │   └── playwright-summary.txt
│       └── health.json
└── scratch/                # per-session scratch (not committed)
```

## Schemas

- `tasks.json`: see `.claude/commands/cooperate.md` for the task object shape.
- handoffs: see `.claude/skills/handoff-discipline/SKILL.md` for the Handoff JSON shape (mirrors `workspace/platform/cooperations/internal/types/types.go`).
- evidence bundle: see `.claude/skills/evidence-bundle/SKILL.md`.

## Why some paths are committed and others are not

- **Audit trail** — `tasks.json` and `handoffs/` are committed so cooperation history travels with the branch.
- **Per-run noise** — `evidence/` and `scratch/` can be regenerated and contain large outputs; the project's `.cooperations/.gitignore` excludes them.
