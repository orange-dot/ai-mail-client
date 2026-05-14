# Pipeline Phases

Phase, sandbox, and approval-transition table for cooperations. Mirrors `lab_tools/runner_pipeline.py` § `PHASES`, § `APPROVAL_TRANSITIONS`, scoped to mail-shaped work.

## Phase table

| Phase | Role | Specialist agent | Sandbox | Checkpoint gate | Artifact filename |
|---|---|---|---|---|---|
| `plan` | architect | `product-planner` | `read-only` | `plan_check` | `plan.md` |
| `claude_review` | reviewer | `deployment-reviewer` | `read-only` | `review_check` | `claude-review.md` |
| `plan_refine` | architect | `product-planner` | `read-only` | `refine_check` | `refined-plan.md` |
| `implement` | implementer | `frontend-ux` \| `email-integration` \| `ai-features` | `workspace-write` | — | `implementation-result.md` |
| `test` | implementer (test) | `test-runner` | `read-only` on src | — | `test-report.md` |
| `claude_final` | reviewer | `deployment-reviewer` | `read-only` | `final_check` | `claude-final-critique.md` |

## Approval transitions

Verbatim translation of `APPROVAL_TRANSITIONS` from lab_tools:

```
plan_check:
  approve → claude_review
  revise  → plan
  stop    → null   (halt cooperation, status=halted)

review_check:
  approve → implement
  revise  → plan_refine
  stop    → null

refine_check:
  approve → claude_review
  revise  → plan_refine
  stop    → null

final_check:
  approve → null   (done, status=completed)
  revise  → implement
  stop    → null
```

## Sandbox enforcement

- `read-only` phases: agent's `tools:` frontmatter excludes `Edit`/`Write` for `src/`; `.claude/settings.json` `permissions.deny` blocks `Edit(.env*)`. The implement phase is the only one with workspace-write.
- The `handoff-validator.mjs` hook surfaces a warning when an `Edit`/`Write` against `src/` happens during a read-only phase. Treat it as a contract violation.
- `danger-full-access` is not used. `demo-mode-parity.md` keeps the project inside `workspace-write`.

## Capabilities per phase

Each phase pulls specific skills. Defaults applied by the orchestrator:

| Phase | Skills pulled |
|---|---|
| `plan` | `spec-drift-guard`, `handoff-discipline` |
| `claude_review` | `spec-drift-guard`, `security-token-review` (if `src/server/{auth,security}/*` touched) |
| `plan_refine` | same as `plan` |
| `implement` | depends on implementer: `frontend-ux` → `mobile-pwa-review`; `email-integration` → `provider-adapter-design`; `ai-features` → `ai-email-triage` |
| `test` | `smoke-path-mail` |
| `claude_final` | all of the above + `evidence-bundle` |

## Max review cycles

Default 2 (mirrors cooperations `MAX_REVIEW_CYCLES`). If `plan_check revise` or `review_check revise` fires twice without `approve`, the orchestrator escalates: navigator records the situation in `tasks.json`, user is prompted to either widen scope or `stop` the cooperation.

## Provenance

- `lab_tools/runner_pipeline.py` — PhaseDefinition dataclass, PHASES dict, APPROVAL_TRANSITIONS dict.
- `lab_tools/smoke.py` — proof level + artifact pattern model.
- `lab_tools/evidence.py` — EvidenceBundle shape for the closing skill.
