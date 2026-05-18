# Agents, Skills, Commands, Rules, Hooks, Plugins

Catalog of the Claude Code infrastructure used by the cooperation mob workflow on `dev`.

## Agents (`.claude/agents/`)

| Agent | Role | Sandbox | Scope |
|---|---|---|---|
| `product-planner` | architect | read-only | `specs/`, plan and plan_refine phases. Writes only under `.cooperations/evidence/<task-id>/`. |
| `frontend-ux` | implementer | workspace-write (implement phase) | `src/components/`, `src/app/`, `public/`. Mobile-first PWA. |
| `email-integration` | implementer | workspace-write (implement phase) | `src/server/mail/adapters/`, `src/server/auth/`, `src/app/api/{accounts,connect,mail}/`. Provider adapter and OAuth/IMAP. |
| `ai-features` | implementer | workspace-write (implement phase) | `src/server/ai/`, `src/app/api/ai/`. Anthropic path + deterministic fallback. |
| `test-runner` | implementer (test phase) | read-only on src | `tests/`, `src/**/*.test.ts`. Runs `npm run check`, `npm run test:e2e`. |
| `deployment-reviewer` | reviewer | read-only | claude_review and claude_final phases. Vercel, env, secrets, demo-mode parity. |
| `mob-orchestrator` | system | n/a | Master orchestrator. Routes tasks, manages state machine. Mirrors cooperations Router + WorkflowEngine. |
| `mob-navigator` | navigator | read-only | Context-keeper. Answers status questions without re-running specialists. |

## Skills (`.claude/skills/`)

Each skill is a directory with a `SKILL.md` that includes YAML frontmatter (`name`, `description`).

| Skill | Triggers on |
|---|---|
| `provider-adapter-design` | Edits to `src/server/mail/adapters/`, `src/server/auth/oauth.ts`, `src/app/api/{connect,mail}/`. |
| `mobile-pwa-review` | Edits to `src/components/MailApp.tsx`, `src/app/layout.tsx`, `src/app/globals.css`, `public/manifest.webmanifest`, `public/sw.js`. |
| `ai-email-triage` | Edits to `src/server/ai/`, `src/app/api/ai/`. |
| `security-token-review` | Edits to `src/server/security/crypto.ts`, `src/server/auth/oauth.ts`, `.env.example`, `next.config.mjs`, `src/app/api/connect/`, `src/app/api/settings/credentials/`. |
| `handoff-discipline` | Every role transition. |
| `spec-drift-guard` | `claude_review`, `claude_final`, manual `/spec-check`. |
| `smoke-path-mail` | `test` phase; manual `/mail-smoke`. |
| `evidence-bundle` | `final_check approve`. |
| `pipeline-phase` | Authoritative reference for phase / transition / sandbox. |

## Commands (`.claude/commands/`)

| Command | What it does |
|---|---|
| `/cooperate "<task>"` | Start a cooperation. Routes to product-planner. |
| `/handoff <to-role>` | Record a role transition. Writes a handoff JSON. |
| `/checkpoint <gate> <approve\|revise\|stop>` | Apply a gate decision. Advances or loops the cooperation. |
| `/cooperation-status [task-id]` | Show the active (or specified) cooperation. |
| `/mail-smoke [smoke\|heavy]` | Run the canonical smoke or heavy proof. |
| `/spec-check [path]` | Invoke spec-drift-guard skill across the repo. |

## Rules (`.claude/rules/`)

Always-on invariants:

| Rule | Invariant |
|---|---|
| `specs-first.md` | No `src/` edit without spec consistency. |
| `sandbox-discipline.md` | Sandbox per phase, enforced by `tools:` and permissions. |
| `handoff-required.md` | Every role transition writes a handoff JSON. |
| `demo-mode-parity.md` | `DEMO_MODE=true` always works on `dev`. |

## Hooks (`.claude/hooks/`, wired in `.claude/settings.json`)

| Hook | Event | Matcher | Purpose |
|---|---|---|---|
| `cooperation-init.mjs` | `SessionStart` | — | Ensure `.cooperations/` exists; print active cooperation. |
| `env-check.mjs` | `SessionStart` | — | Validate required env for real-provider mode. |
| `checkpoint-record.mjs` | `UserPromptSubmit` | `/checkpoint*` | Append a checkpoint record to `.cooperations/tasks.json`. |
| `specs-drift-guard.mjs` | `PreToolUse` | `Edit\|Write\|MultiEdit` on `src/server/{mail/adapters,ai}/`, `src/app/api/{mail,ai}/`, `src/components/MailApp.tsx` | Warn if spec is stale. |
| `handoff-validator.mjs` | `PreToolUse` | `Edit\|Write\|MultiEdit` on `src/` | Warn if no recent handoff names the editing agent. |
| `pre-test.mjs` | `PreToolUse` | `Bash` running test commands | Validate required workflow files exist. |
| `pre-deploy.mjs` | `PreToolUse` | `Bash` running deploy commands | Block deploy without `TOKEN_ENCRYPTION_KEY` outside demo mode. |
| `no-secret-commit.mjs` | `PreToolUse` | `Bash` running `git commit` | Scan staged files for secret patterns. |

## Plugins / Tools

- Claude Code CLI for the local cooperation mob workflow.
- Local plugin bundle at `plugins/cooperation-mob/` mirrors the artifact set for portability to other projects or to the lab `plugins/` marketplace.
- The project-local plugin bundle includes the cooperation commands, core mob agents, phase/rule skills, and hooks needed to replay the handoff/checkpoint workflow outside this repo.
- GitHub for source handoff and Vercel import (real-mode deploys only).
- Vercel for hosting and Postgres integration.
- Playwright for mobile/desktop workflow tests.
- Vitest for unit and integration tests.
- Anthropic API for deployed AI features (server-only).

## Claude Code Discipline

- Planning, implementation, review, and test ownership are separated by agent role instead of being handled as one undifferentiated coding pass.
- Hooks enforce workflow hygiene before risky actions: spec drift checks before edits, handoff validation before source changes, test/deploy guards before commands, and secret scanning before commits.
- Skills encode the highest-risk review lenses: provider adapter boundaries, token handling, AI fallback parity, mobile PWA behavior, and evidence packaging.
- `.cooperations/tasks.json` and `.cooperations/handoffs/*.json` provide an auditable trail for what was planned, who owned the next phase, and which constraints were carried forward.

## Runtime state (`.cooperations/`)

Audit trail of cooperations. See `.cooperations/README.md`. Files `tasks.json` and `handoffs/*.json` are committed; `evidence/` and `scratch/` are git-ignored.
