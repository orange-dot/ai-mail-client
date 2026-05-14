# handoff-required

Every cross-role transition needs a handoff JSON written under `.cooperations/handoffs/`. No specialist agent may act without a current handoff naming it as `to_role`.

Procedure (mirrors `.claude/skills/handoff-discipline/SKILL.md`):

1. Outgoing role finishes its phase artifact in `.cooperations/evidence/<task-id>/`.
2. Outgoing role (or the user) runs `/handoff <next-role>`.
3. The handoff JSON is written at `.cooperations/handoffs/<task-id>-<seq>.json`.
4. `.cooperations/tasks.json` is updated: `current_role`, `current_phase`, `sandbox`, `recent_handoffs[]`.

Refusal cases:

- Incoming agent receives a request but the latest handoff for the active task has a `to_role` mismatch → refuse with the expected role.
- A handoff exists but the prior phase artifact does not → refuse, ask the outgoing role to finish.
- Two simultaneous handoffs for the same task → reject the second; sequence numbers are monotonic.

The `handoff-validator.mjs` hook (PreToolUse on Edit/Write to `src/`) raises a soft warning if no recent handoff names the editing agent. It is a guard rail, not a substitute for discipline.
