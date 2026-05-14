---
description: Show the active cooperation's phase, role, recent handoffs, pending checkpoint, and blockers. Read-only.
argument-hint: [task-id]
---

# /cooperation-status

Default behavior: report the single `in_progress` cooperation. If `$ARGUMENTS` is a task-id, report that one instead (even if completed or halted).

## Steps

1. Read `.cooperations/tasks.json`.
2. Pick the target task:
   - `$ARGUMENTS` empty → the unique `in_progress` task. If zero or >1 in_progress, list candidates and exit.
   - `$ARGUMENTS` = a task-id → fetch that record. Reject if not found.
3. Read the last 5 entries of `.cooperations/handoffs/<task-id>-*.json` sorted by sequence.
4. Read the task's `checkpoints[]` for any pending gate.
5. Identify the next concrete action:
   - If phase ∈ {plan, claude_review, plan_refine, claude_final}: "produce <artifact>" or "run /checkpoint <gate> approve|revise|stop".
   - If phase = implement: "implement per plan; specialist=<x>".
   - If phase = test: "run npm run check; report green/red".

## Output

Use the shape from `.claude/agents/mob-navigator.md`:

```
[navigator] task=<task-id>
description: <task description>
phase: <phase>
role: <role>
sandbox: <sandbox>
planned implementer: <x>
recent handoffs:
  - <seq> <ts> <from> → <to>
  ...
pending checkpoint: <gate or "none">
revise counts: plan_check=<n>/2 review_check=<n>/2 refine_check=<n>/2 final_check=<n>/2
blockers:
  - <blocker or "none">
next step: <one concrete action>
```

## Refusal

- `.cooperations/tasks.json` missing → reject with "no cooperations yet; run /cooperate".
- Multiple in_progress with no `$ARGUMENTS` → list ids, ask user to pick.
