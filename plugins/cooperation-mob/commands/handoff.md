---
description: Record a role handoff. Writes a handoff JSON under .cooperations/handoffs/ and updates the active task's current_role.
argument-hint: <to-role>
---

# /handoff

Pass control to `$ARGUMENTS` (one of: `architect`, `implementer:<specialist>`, `reviewer`, `test-runner`, `navigator`).

## Steps

1. Read `.cooperations/tasks.json`. Find the task with `status: in_progress`. If none, reject with "no active cooperation".
2. Determine the next sequence number: count files matching `.cooperations/handoffs/<task-id>-*.json` and add 1.
3. Determine the current role from the task object. The handoff `from_role` is that role; `to_role` is `$ARGUMENTS` mapped to the role enum.
4. Determine the next phase from the role + current phase per `.claude/skills/pipeline-phase/SKILL.md`. Refuse if the transition is not allowed (e.g. handing off to implementer while no `review_check approve` has fired).
5. Write `.cooperations/handoffs/<task-id>-<seq>.json` using the schema in `.claude/skills/handoff-discipline/SKILL.md`. `files_in_scope` should mirror the plan or refined plan; `artifacts.produced` lists what the *outgoing* role just wrote; `artifacts.consumed` lists what they read.
6. Update `.cooperations/tasks.json` for the active task:
   - `current_role` = `$ARGUMENTS`'s role.
   - `current_phase` = the new phase.
   - `sandbox` = the phase's default sandbox.
   - `recent_handoffs` = append `{seq, from_role, to_role, timestamp}` and truncate to the last 5.

## Role mapping

| Argument | Role enum |
|---|---|
| `architect`, `product-planner` | `architect` |
| `frontend-ux` | `implementer` (specialist=frontend-ux) |
| `email-integration` | `implementer` (specialist=email-integration) |
| `ai-features` | `implementer` (specialist=ai-features) |
| `reviewer`, `deployment-reviewer` | `reviewer` |
| `test-runner` | `implementer` (specialist=test-runner) — test phase |
| `navigator`, `mob-navigator` | `navigator` |

## Output

```
[handoff] task=<task-id> seq=<NNN> <from> → <to>
next phase: <phase> sandbox: <sandbox>
```

## Refusal

- `$ARGUMENTS` is not a recognized role → reject.
- Active phase requires a `/checkpoint` before transition → reject with the gate name.
- No `.cooperations/tasks.json` entry `in_progress` → reject.
