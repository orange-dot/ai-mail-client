# Cooperation Model

Distillation of the mob-programming model from `workspace/platform/cooperations/`, scoped to this project.

## What is a cooperation

A cooperation is one feature, fix, or refactor moved through a multi-role workflow with explicit handoffs. The unit of work is the cooperation; the unit of audit is the handoff.

A cooperation has:

- A **task-id** (`coop-YYYYMMDD-HHMMSS-<slug>`).
- A **current role** (one of: `architect`, `implementer`, `reviewer`, `navigator`, `system`, `human`).
- A **current phase** (one of: `plan`, `claude_review`, `plan_refine`, `implement`, `test`, `claude_final`).
- A **sandbox** (`read-only` or `workspace-write`).
- A **handoff trail** — append-only, sequence-numbered JSON files.
- An **evidence directory** — per-phase artifacts and outputs.

## Role enum

Lifted from `workspace/platform/cooperations/internal/types/types.go`:

| Role | Specialist agent(s) in this project |
|---|---|
| `architect` | `product-planner` |
| `implementer` | `frontend-ux`, `email-integration`, `ai-features`, `test-runner` |
| `reviewer` | `deployment-reviewer` |
| `navigator` | `mob-navigator` |
| `system` | `mob-orchestrator` |
| `human` | the user |

## Handoff JSON shape

```json
{
  "task_id": "coop-20260514-101530-aux",
  "timestamp": "2026-05-14T10:18:42Z",
  "from_role": "architect",
  "to_role": "reviewer",
  "context": {
    "task_description": "<verbatim user task>",
    "requirements": ["<one>", "<two>"],
    "constraints": ["demo-mode parity preserved", "no spec drift"],
    "files_in_scope": ["src/server/ai/anthropic.ts"],
    "sandbox": "read-only"
  },
  "artifacts": {
    "produced": [".cooperations/evidence/<task-id>/plan.md"],
    "consumed": ["specs/ai-features.md"]
  },
  "metadata": {
    "phase": "plan",
    "next_phase": "claude_review",
    "next_checkpoint": "plan_check"
  }
}
```

Field-for-field this mirrors `workspace/platform/cooperations/internal/types/types.go` § `Handoff`, `HContext`, `HArtifacts`, `HMetadata`. The on-disk filename is `.cooperations/handoffs/<task-id>-<NNN>.json`.

## Sandbox enum

| Sandbox | Allowed writes |
|---|---|
| `read-only` | `.cooperations/evidence/<task-id>/` only. |
| `workspace-write` | `src/`, `tests/`, `.cooperations/evidence/<task-id>/`. Still not `specs/`, `.env*`, `node_modules/`. |
| `danger-full-access` | Not used in this project. The `demo-mode-parity.md` rule rejects it. |

## Routing heuristics

The orchestrator picks the implement-phase specialist by keyword over the task description:

| Pattern | Specialist |
|---|---|
| `ui\|component\|inbox\|compose\|reader\|pwa\|manifest\|service worker\|layout\|mobile` | `frontend-ux` |
| `gmail\|microsoft\|graph\|imap\|smtp\|oauth\|adapter\|provider\|account` | `email-integration` |
| `summary\|draft\|prioritize\|priority\|anthropic\|ai\|sparkle\|triage` | `ai-features` |
| `vercel\|env\|deploy\|security\|crypto\|secret\|token` | `deployment-reviewer` (review only; needs an implementer co-owner) |

Multiple matches → highest count wins. Tie → ask the user.

## Max review cycles

Mirrors cooperations `MAX_REVIEW_CYCLES` = 2. After two `revise` decisions on the same gate, the orchestrator escalates to the navigator and the user.

## Provenance

- `workspace/platform/cooperations/internal/types/types.go` — Role, SandboxMode, Handoff, HContext, HArtifacts, HMetadata.
- `workspace/platform/cooperations/internal/orchestrator/router.go` — keyword routing.
- `workspace/platform/cooperations/.claude/commands/` — command shape inspiration.
- `workspace/platform/cooperations/STRATEGY.md` — overall philosophy.
