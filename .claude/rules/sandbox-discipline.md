# sandbox-discipline

Each cooperation phase runs at a default sandbox level (mirrors cooperations `SandboxMode`).

| Phase | Sandbox | What may be written |
|---|---|---|
| plan | `read-only` | `.cooperations/evidence/<task-id>/plan.md` only |
| claude_review | `read-only` | `.cooperations/evidence/<task-id>/claude-review.md` only |
| plan_refine | `read-only` | `.cooperations/evidence/<task-id>/refined-plan.md` only |
| implement | `workspace-write` | `src/`, `tests/`, plan-permitted files |
| test | `read-only` on src | `tests/`, `.cooperations/evidence/<task-id>/test-report.md` |
| claude_final | `read-only` | `.cooperations/evidence/<task-id>/claude-final-critique.md` only |

Implications:

- During `read-only` phases, an agent must not `Edit` or `Write` anything in `src/`. The agent's `tools:` frontmatter and `.claude/settings.json` `permissions.allow` together enforce this.
- `danger-full-access` is not used. The `demo-mode-parity.md` rule keeps the project inside `workspace-write`.
- The orchestrator updates `current_sandbox` on the active task object in `.cooperations/tasks.json` on every phase transition.
- Any attempt to widen sandbox mid-phase requires the user via `/checkpoint` to revise or restart with the right phase.

Refusal cases:

- Implementer asked to write code while phase is `claude_review` → refuse, redirect to `/checkpoint review_check approve` first.
- Reviewer asked to edit `src/` → refuse, reviewer is read-only.
- Architect asked to edit a `src/` file → refuse, route to the implementer for the implement phase.
