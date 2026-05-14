# CLAUDE.md

This project is built with a Claude Code mob-programming workflow. The `main` branch carries the Codex-driven implementation. The `dev` branch carries the Claude-driven re-implementation and the full cooperation infrastructure described below.

## Mission

Ship an AI-first universal email client PWA for Gmail, Office 365, and IMAP accounts. Email-only product: unified inbox, account switching, compose, reply, forward, search, labels, archive, delete, AI summaries, AI reply drafts, prioritization.

Target on `dev` branch: **demo-mode parity with `main`**. See `.claude/rules/demo-mode-parity.md`.

## Operating Method (cooperation mob)

Every change moves through one cooperation. A cooperation is a five-phase pipeline with checkpoint gates, modeled on `workspace/platform/cooperations/` and `lab_tools/runner_pipeline.py`.

```
plan          (architect: product-planner)            sandbox: read-only
  └─ plan_check        approve→ claude_review         revise→ plan         stop→ halt
claude_review (reviewer: deployment-reviewer)         sandbox: read-only
  └─ review_check      approve→ implement             revise→ plan_refine  stop→ halt
plan_refine   (architect: product-planner)            sandbox: read-only
  └─ refine_check      approve→ claude_review         revise→ plan_refine  stop→ halt
implement     (implementer: frontend-ux | email-integration | ai-features)
                                                       sandbox: workspace-write
test          (test-runner)                            sandbox: read-only on src
claude_final  (reviewer: deployment-reviewer)          sandbox: read-only
  └─ final_check       approve→ done                  revise→ implement    stop→ halt
```

### Commands

- `/cooperate "<task>"` — start a cooperation. Generates a task-id, writes `.cooperations/tasks.json`, routes to product-planner.
- `/handoff <to-role>` — record a role transition. Writes `.cooperations/handoffs/<task-id>-<seq>.json`.
- `/checkpoint <gate> <approve|revise|stop>` — apply a gate decision.
- `/cooperation-status [task-id]` — show active or specified cooperation.
- `/mail-smoke [smoke|heavy]` — run the canonical smoke (`npm run check`) or heavy proof (adds `npm run test:e2e`).
- `/spec-check [path]` — invoke the spec-drift-guard skill across the repo.

### Roles

- **architect** — `product-planner`. Plan and plan_refine phases. Read-only on `src/`.
- **implementer** — `frontend-ux`, `email-integration`, `ai-features`. Implement phase only. Workspace-write.
- **reviewer** — `deployment-reviewer`. claude_review and claude_final phases. Read-only.
- **test-runner** — test phase. Read-only on `src/`, may add tests under `tests/`.
- **navigator** — `mob-navigator`. Read-only context-keeper.
- **system** — `mob-orchestrator`. Routes work, manages state machine.

### Skills

Triggered automatically by relevant edits, or invoked explicitly:

- `provider-adapter-design` — keeps protocol details behind `MailProviderAdapter`.
- `mobile-pwa-review` — checks UI / manifest / service-worker / hydration.
- `ai-email-triage` — keeps Anthropic and fallback paths shape-identical.
- `security-token-review` — credentials, OAuth, env, secret hygiene.
- `handoff-discipline` — handoff JSON contract.
- `spec-drift-guard` — drift between `src/` and `specs/`.
- `smoke-path-mail` — canonical smoke + heavy proof.
- `evidence-bundle` — pack cooperation artifacts at `final_check approve`.
- `pipeline-phase` — phase + transition + sandbox definitions.

### Rules

Always-on invariants:

- `specs-first.md` — no `src/` edit without spec consistency.
- `sandbox-discipline.md` — sandbox per phase, enforced.
- `handoff-required.md` — every role transition writes a handoff.
- `demo-mode-parity.md` — `DEMO_MODE=true` always works.

### Hooks (wired in `.claude/settings.json`)

- `SessionStart`: `cooperation-init.mjs`, `env-check.mjs`.
- `UserPromptSubmit`: `checkpoint-record.mjs`.
- `PreToolUse Edit|Write|MultiEdit`: `specs-drift-guard.mjs`, `handoff-validator.mjs`.
- `PreToolUse Bash`: `pre-test.mjs`, `pre-deploy.mjs`, `no-secret-commit.mjs`.

## Safety

- Never log OAuth tokens, IMAP passwords, Anthropic API keys, model identifiers, or raw message bodies in production routes.
- Store provider secrets encrypted with `TOKEN_ENCRYPTION_KEY` via `src/server/security/crypto.ts`.
- AI endpoints may summarize or draft from email content, but they must not send mail.
- The app must remain usable in demo mode when external provider credentials are absent.

## Delivery checklist (per cooperation)

- Plan, review, (optional) refined plan, implementation result, test report, final critique all present in `.cooperations/evidence/<task-id>/`.
- `npm run check` green; `npm run test:e2e` green if UI was touched.
- `evidence-bundle` skill produced `sources.json` and `health.json` on `final_check approve`.

## Validation reference

```bash
npm install
npm run env:check
npm run dev
npm run check
npm run test:e2e
npm run build
```

See `docs/workflow.md` for the full cooperation walk-through and `docs/pipeline-phases.md` for phase definitions.
