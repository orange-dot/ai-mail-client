---
description: Apply a checkpoint gate decision (approve | revise | stop). Advances or loops the cooperation per the lab_tools APPROVAL_TRANSITIONS table.
argument-hint: <gate> <approve|revise|stop>
---

# /checkpoint

Parse `$ARGUMENTS` as `<gate> <decision>`.

## Allowed gates and decisions

Per `.claude/skills/pipeline-phase/SKILL.md` and `lab_tools/runner_pipeline.py`:

| Gate | approve | revise | stop |
|---|---|---|---|
| `plan_check` | → `claude_review` | → `plan` | halt |
| `review_check` | → `implement` | → `plan_refine` | halt |
| `refine_check` | → `claude_review` | → `plan_refine` | halt |
| `final_check` | → done (close task) | → `implement` | halt |

## Steps

1. Read `.cooperations/tasks.json`. Find the `in_progress` task. Reject if none.
2. Verify the task's `current_phase` is the phase whose checkpoint matches the gate (e.g. `plan_check` only valid in phase `claude_review`). Reject if mismatched.
3. Verify the corresponding evidence file exists:
   - `plan_check` → `.cooperations/evidence/<task-id>/claude-review.md` must exist.
   - `review_check` → same (claude-review.md).
   - `refine_check` → `.cooperations/evidence/<task-id>/claude-review.md` (re-review of refined plan).
   - `final_check` → `.cooperations/evidence/<task-id>/claude-final-critique.md` must exist.
4. Apply the transition:
   - `approve`: set `current_phase` to the next phase, `current_role` to that phase's owner, `sandbox` to that phase's default.
   - `revise`: set `current_phase` to the revise target. Increment a `revise_count[<gate>]` on the task; if it reaches 2 (`MAX_REVIEW_CYCLES`), warn and escalate to navigator.
   - `stop`: set `status` to `halted`. The task is closed.
5. Append a checkpoint record to the task object: `{gate, decision, timestamp}` under `checkpoints[]`.
6. On `final_check approve`: set `status` to `completed`, invoke `evidence-bundle` skill, freeze evidence.

## Output

```
[checkpoint] task=<task-id> gate=<gate> decision=<decision>
next phase: <phase or "done"> role: <role or "—">
revise count: <n>/2
```

## Refusal

- Gate not matching current phase → reject with expected gate.
- Required evidence file missing → reject with the path.
- `decision` not one of `approve|revise|stop` → reject.
