# cooperation-mob

Mob-programming cooperation workflow for Claude Code, distilled from two upstream sources:

- `workspace/platform/cooperations/` — Go orchestrator implementing the four-role handoff state machine (architect / implementer / reviewer / navigator), sandbox modes, and on-disk task + handoff persistence.
- `lab_tools/runner_pipeline.py` — five-phase pipeline (plan → claude_review → plan_refine → implement → claude_final) with checkpoint gates (`approve` / `revise` / `stop`).

This bundle is a **portable, project-agnostic** subset of the cooperation infrastructure used on `dev` branch of `ai-mail-client`. The project-specific agents, skills, and hooks (provider adapters, AI triage, PWA review, security review, smoke path, the four pre-existing hooks) stay in the project. This bundle ships only the cross-cutting workflow primitives.

## Contents

- `agents/`
  - `mob-orchestrator.md` — routes work and manages the state machine.
  - `mob-navigator.md` — read-only context-keeper.
- `skills/`
  - `handoff-discipline/SKILL.md` — handoff JSON contract.
  - `spec-drift-guard/SKILL.md` — generic spec-vs-code drift signaling (host project supplies the signal table).
  - `smoke-path-mail/SKILL.md` — *project-tinted* smoke; replace with your project's smoke path when forking.
  - `evidence-bundle/SKILL.md` — pack cooperation artifacts at `final_check approve`.
  - `pipeline-phase/SKILL.md` — phase / transition / sandbox table.
- `commands/`
  - `/cooperate`, `/handoff`, `/checkpoint`, `/cooperation-status`.
- `rules/`
  - `sandbox-discipline.md`, `handoff-required.md`.
- `hooks/`
  - `cooperation-init.mjs` (SessionStart), `checkpoint-record.mjs` (UserPromptSubmit), `handoff-validator.mjs` (PreToolUse Edit|Write).

## How to enable in another project

1. Copy `plugins/cooperation-mob/` into the host project (anywhere — typically alongside `.claude/`).
2. Symlink or copy the bundle's components into the host's `.claude/`:
   ```bash
   mkdir -p .claude/{agents,skills,commands,rules,hooks}
   for d in agents skills commands rules hooks; do
     cp -r plugins/cooperation-mob/$d/* .claude/$d/
   done
   ```
3. Wire the hooks in `.claude/settings.json`:
   ```json
   {
     "hooks": {
       "SessionStart": [{ "hooks": [{ "type": "command", "command": "node .claude/hooks/cooperation-init.mjs" }] }],
       "UserPromptSubmit": [{ "hooks": [{ "type": "command", "command": "node .claude/hooks/checkpoint-record.mjs" }] }],
       "PreToolUse": [
         { "matcher": "Edit|Write|MultiEdit", "hooks": [{ "type": "command", "command": "node .claude/hooks/handoff-validator.mjs" }] }
       ]
     }
   }
   ```
4. Replace `skills/smoke-path-mail/SKILL.md` with a `smoke-path-<project>/SKILL.md` that describes your project's canonical verify command.
5. Replace the host project's `spec-drift-guard` signal table with one that maps your codebase paths to your specs.
6. Initialize `.cooperations/`:
   ```bash
   mkdir -p .cooperations/{handoffs,evidence}
   echo '{"tasks": []}' > .cooperations/tasks.json
   ```

## What this bundle does NOT do

- It does not ship the project's specialist agents (frontend-ux, email-integration, ai-features, deployment-reviewer, test-runner, product-planner). Those are project-shaped; the cooperation workflow is the only generic part.
- It does not enforce checkpoint gates by code. The commands describe behavior; the orchestrator agent reads the task ledger and the user issues `/checkpoint`. The hooks only *record* and *warn*; they do not block.
- It does not replicate the cooperations Go binary's TUI, capability registry, or YAML flow loader. The pipeline is the portable distillation; the runtime is intentionally lean.

## Promoting to the lab marketplace

This bundle is intended to be lifted into `forks/` or `workspace/` lab `plugins/` directories (and ultimately the lab `marketplace.json`) once it has been used in a second host project and any project-tinting has been factored out. Track that lift as a follow-up; see the `out of scope` section in the project's planning doc.
