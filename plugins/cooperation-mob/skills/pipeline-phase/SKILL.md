---
name: pipeline-phase
description: Five-phase pipeline definitions for cooperations, mirroring lab_tools/runner_pipeline.py PHASES and APPROVAL_TRANSITIONS. Defines per-phase role, sandbox, artifact filename, checkpoint gate, and allowed transitions.
---

# pipeline-phase

Source of truth: `lab_tools/runner_pipeline.py` § `PHASES`, § `APPROVAL_TRANSITIONS`.

## Phases

| Phase | Role | Default sandbox | Checkpoint gate | Artifact filename |
|---|---|---|---|---|
| `plan` | architect (product-planner) | read-only | `plan_check` | `plan.md` |
| `claude_review` | reviewer (deployment-reviewer) | read-only | `review_check` | `claude-review.md` |
| `plan_refine` | architect (product-planner) | read-only | `refine_check` | `refined-plan.md` |
| `implement` | implementer (frontend-ux \| email-integration \| ai-features) | workspace-write | _(no gate; hands off to test phase)_ | `implementation-result.md` |
| `test` | test-runner | read-only on src, write on tests | _(no gate; hands off to claude_final on green)_ | `test-report.md` |
| `claude_final` | reviewer (deployment-reviewer) | read-only | `final_check` | `claude-final-critique.md` |

## Approval transitions

Mirrors `APPROVAL_TRANSITIONS` in lab_tools verbatim:

```
plan_check:
  approve → claude_review
  revise  → plan
  stop    → null (halt)

review_check:
  approve → implement
  revise  → plan_refine
  stop    → null

refine_check:
  approve → claude_review
  revise  → plan_refine
  stop    → null

final_check:
  approve → null (done)
  revise  → implement
  stop    → null
```

## Sandbox enforcement

- `read-only`: agent may write only to `.cooperations/evidence/<task-id>/`. The `handoff-validator.mjs` hook + the agent frontmatter `tools` whitelist enforce this.
- `workspace-write`: agent may write to `src/`, `tests/`, and `.cooperations/evidence/<task-id>/`. Still must not touch `specs/`, `.env.local`, `node_modules/`, `.next/`.
- `danger-full-access`: not used in this project. Out of scope by `demo-mode-parity.md` rule.

## Max review cycles

Default 2 (mirrors cooperations `MAX_REVIEW_CYCLES`). If `plan_check revise` fires twice without `approve`, the orchestrator escalates to navigator + human.

## Capabilities per phase

Each phase may declare required skills (`skill:<name>`) or specialist agents. Defaults:

- `plan`: skill:spec-drift-guard, skill:handoff-discipline.
- `claude_review`: skill:spec-drift-guard, skill:security-token-review (if any src/server/security/* touched).
- `plan_refine`: same as plan.
- `implement`: depends on implementer; frontend-ux pulls skill:mobile-pwa-review, email-integration pulls skill:provider-adapter-design, ai-features pulls skill:ai-email-triage.
- `test`: skill:smoke-path-mail.
- `claude_final`: all of the above + skill:evidence-bundle.
