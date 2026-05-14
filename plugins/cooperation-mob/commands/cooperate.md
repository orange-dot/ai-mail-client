---
description: Start a new cooperation. Creates a task-id, writes .cooperations/tasks.json entry, routes to product-planner for the plan phase.
argument-hint: <task description>
---

# /cooperate

Kick off a cooperation mob session for `$ARGUMENTS`.

## Steps

1. Generate a `task-id` of the form `coop-YYYYMMDD-HHMMSS-<3-letter-slug>` from the current UTC time.
2. Read `.cooperations/tasks.json`. If it doesn't exist, create `{"tasks": []}`.
3. Refuse if any task in the file is `status: in_progress` and the user did not explicitly say "interleave". Surface that task and exit with a one-line "active cooperation: <id>".
4. Append a new task object:
   ```json
   {
     "id": "<task-id>",
     "description": "$ARGUMENTS",
     "created_at": "<ISO8601 UTC>",
     "status": "in_progress",
     "current_phase": "plan",
     "current_role": "architect",
     "sandbox": "read-only",
     "recent_handoffs": []
   }
   ```
5. Create the evidence directory: `.cooperations/evidence/<task-id>/`.
6. Apply the routing heuristic from `.claude/agents/mob-orchestrator.md` to determine which implementer will own the implement phase. Record it in the task object under `planned_implementer`.
7. Hand off to **product-planner** for the plan phase. Write the first handoff JSON at `.cooperations/handoffs/<task-id>-001.json` per `.claude/skills/handoff-discipline/SKILL.md`:
   ```json
   {
     "task_id": "<task-id>",
     "timestamp": "<now>",
     "from_role": "system",
     "to_role": "architect",
     "context": {
       "task_description": "$ARGUMENTS",
       "requirements": [],
       "constraints": ["demo-mode parity preserved", "no spec drift"],
       "files_in_scope": ["specs/product.md", "specs/email-adapters.md", "specs/ai-features.md"],
       "sandbox": "read-only"
     },
     "artifacts": {"produced": [], "consumed": []},
     "metadata": {
       "phase": "plan",
       "next_phase": "claude_review",
       "next_checkpoint": "plan_check"
     }
   }
   ```

## Output

```
[mob-orchestrator] task=<task-id> phase=plan role=architect sandbox=read-only
next: product-planner via /handoff architect
planned implementer: <frontend-ux | email-integration | ai-features | undecided>
```

## Refusal

- `$ARGUMENTS` empty → reject with "cooperate needs a task description".
- Two or more cooperations already `in_progress` → reject with "settle existing cooperation first".
