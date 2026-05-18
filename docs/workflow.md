# Workflow

This project uses a Claude Code mob-programming workflow on `dev`, modeled on `workspace/platform/cooperations/` and `lab_tools/runner_pipeline.py`. Every change moves through a cooperation: a five-phase pipeline with checkpoint gates.

## Why this shape

- **Specs as input** — `specs/product.md`, `specs/email-adapters.md`, `specs/ai-features.md` define the contract. The plan phase reads them; nothing is invented mid-implementation.
- **Role separation** — architect plans, implementer codes, reviewer audits, test-runner verifies. The reviewer is read-only on `src/`; the architect is read-only on `src/`. No role can both plan and implement in one phase.
- **Checkpoint gates** — three of the five phases end at a human-decided gate (`plan_check`, `review_check`, `refine_check`, `final_check`). Each gate has three outcomes: `approve`, `revise`, `stop`.
- **Handoffs are auditable** — every role transition writes a JSON record at `.cooperations/handoffs/<task-id>-<seq>.json`. Cooperation history travels with the branch.
- **Sandbox per phase** — read-only phases cannot mutate `src/`. The implement phase is the only one that can.

## Cooperation walk-through

### 1. Start

```
/cooperate "<task description>"
```

- Generates task-id `coop-YYYYMMDD-HHMMSS-<slug>`.
- Appends task object to `.cooperations/tasks.json` with `current_phase=plan`, `current_role=architect`, `sandbox=read-only`.
- Creates `.cooperations/evidence/<task-id>/`.
- Writes initial handoff `<task-id>-001.json` (system → architect).
- Returns the planned implementer based on the task keywords.

### 2. plan (architect: product-planner)

- Reads `specs/`.
- Writes `.cooperations/evidence/<task-id>/plan.md` with: summary, spec references, files to modify, implementation steps, test plan, risks.
- Hands off: `/handoff reviewer`.

### 3. claude_review (reviewer: deployment-reviewer)

- Audits the plan against specs, security invariants, demo-mode parity, scope.
- Writes `claude-review.md` with verdict.
- User runs: `/checkpoint plan_check approve|revise|stop`.

### 4. plan_refine (architect: product-planner) — optional

Entered if `review_check` returned `revise`. Same shape as plan, output is `refined-plan.md`. Loops back through claude_review (`refine_check`).

### 5. implement (implementer: frontend-ux | email-integration | ai-features)

- Activates only after `/checkpoint review_check approve`.
- Reads `.cooperations/evidence/<task-id>/plan.md`.
- Makes the smallest change that satisfies the plan.
- Writes `implementation-result.md` and hands off: `/handoff test-runner`.

### 6. test (test-runner)

- Runs `npm run check` (always) and `npm run test:e2e` (UI / AI cooperations).
- Writes `test-report.md`.
- Green → `/handoff reviewer`. Red → `/handoff <implementer-role>`.

### 7. claude_final (reviewer: deployment-reviewer)

- Audits diff vs. plan, test report, secret hygiene, drift.
- Writes `claude-final-critique.md` with verdict.
- User runs: `/checkpoint final_check approve|revise|stop`.
- On `approve`: `evidence-bundle` skill packs `sources.json` + `health.json`. Task `status=completed`.

## Development loop

```bash
# Once per environment
npm install

# Every session
npm run env:check        # SessionStart hook also calls this
npm run dev              # local server on http://127.0.0.1:3000

# Before any handoff out of implement
npm run check            # lint + typecheck + vitest
npm run test:e2e         # Playwright mobile + desktop, when UI changes

# Before claude_final approve
npm run check
npm run test:e2e
npm run build
```

## Deployment loop (Vercel)

```bash
# Branch ready
git push origin dev
# Import the GitHub repo in Vercel (per-project, one-time)
# Set variables from .env.example
npm run predeploy        # pre-deploy hook surfaces blockers
npm run build            # production readiness proof
```

The current live review deploy is https://ai-mail-client-tawny.vercel.app. It can run in demo mode without OAuth, Postgres, or Anthropic env vars. For real shared-provider mode, configure the OAuth, Postgres, encryption, and Anthropic variables listed in `.env.example`; for reviewer BYO mode, the setup screen stores Google and Anthropic credentials per browser in an encrypted httpOnly cookie.

## Reference

- `docs/cooperation-model.md` — role / handoff distillation, scoped to this project.
- `docs/pipeline-phases.md` — phase + transition + sandbox table.
- `docs/agents-skills-hooks-plugins.md` — full artifact catalog.
- `.claude/commands/*.md` — slash command surface.
- `.claude/rules/*.md` — always-on invariants.
