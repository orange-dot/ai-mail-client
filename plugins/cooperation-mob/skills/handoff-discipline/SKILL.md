---
name: handoff-discipline
description: Apply at every role transition in a cooperation. Writes a handoff JSON under .cooperations/handoffs/ that mirrors the Handoff struct in workspace/platform/cooperations/internal/types/types.go. No specialist agent may act without a current handoff naming it as ToRole.
---

# handoff-discipline

Source of truth: `workspace/platform/cooperations/internal/types/types.go` § `Handoff struct`.

## When to invoke

- Mob-orchestrator passing control to a specialist.
- A specialist finishing their phase and passing to the next role.
- Test-runner reporting green to claude_final, or red back to the implementer.

## Handoff JSON shape

File: `.cooperations/handoffs/<task-id>-<seq>.json`. Sequence starts at 001 per task, zero-padded to 3 digits.

```json
{
  "task_id": "coop-20260514-101530-aux",
  "timestamp": "2026-05-14T10:18:42Z",
  "from_role": "architect",
  "to_role": "reviewer",
  "context": {
    "task_description": "Re-derive AI Summary path Claude-driven",
    "requirements": [
      "Output shape identical between Anthropic and fallback paths"
    ],
    "constraints": [
      "No new env vars",
      "Demo-mode parity preserved"
    ],
    "files_in_scope": [
      "src/server/ai/anthropic.ts",
      "src/app/api/ai/summary/route.ts"
    ],
    "sandbox": "read-only"
  },
  "artifacts": {
    "produced": [
      ".cooperations/evidence/coop-20260514-101530-aux/plan.md"
    ],
    "consumed": [
      "specs/ai-features.md",
      "specs/product.md"
    ]
  },
  "metadata": {
    "phase": "plan",
    "next_phase": "claude_review",
    "next_checkpoint": "plan_check"
  }
}
```

## Role enum

Allowed values for `from_role` and `to_role`:

- `architect` — product-planner
- `implementer` — frontend-ux | email-integration | ai-features
- `reviewer` — deployment-reviewer
- `navigator` — mob-navigator
- `human` — the user
- `system` — mob-orchestrator

## Rules

1. Specialist agents refuse to start work unless the latest handoff for the active task has `to_role` matching their role family.
2. Every handoff writes a row to `.cooperations/tasks.json` recent-handoffs (rolling 5).
3. Sequence numbers are monotonically increasing per task. Never reuse.
4. Timestamp is ISO 8601 UTC.
5. `files_in_scope` is what the receiving role is expected to read/edit. It is a soft contract; the implementer may decline to widen scope without a fresh handoff.

## Anti-patterns

- Editing `src/` without a handoff pointing at you.
- Handoff with no `next_phase` set (means the orchestrator can't route).
- Skipping the handoff file because "it was obvious".
