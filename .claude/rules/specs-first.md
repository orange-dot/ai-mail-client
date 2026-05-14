# specs-first

`specs/` is the source of truth for product scope, provider contracts, and AI behavior. The rule:

- No edit to `src/` is allowed unless the change is consistent with `specs/product.md`, `specs/email-adapters.md`, and `specs/ai-features.md`.
- If a change requires updating a spec, do that in the **same cooperation, before the implement phase**. The plan must call out the spec change explicitly and the reviewer must approve it.
- `specs/` edits are owned by product-planner. Other agents must not edit `specs/`.
- The `specs-drift-guard.mjs` hook (PreToolUse on Edit/Write to `src/server/{mail/adapters,ai}/`) surfaces drift as a warning. Treat warnings as a contract violation unless the corresponding spec edit is staged in the same session.

If the implement phase touches a file whose behavior cannot be derived from the specs, the cooperation has scope it does not own. Stop the cooperation and open a new one for the missing spec coverage.
