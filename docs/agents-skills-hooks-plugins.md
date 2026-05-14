# Agents, Skills, Hooks, Plugins

## Agents

- `product-planner`: maintains product requirements and acceptance criteria.
- `frontend-ux`: owns mobile inbox, message, compose, and PWA interaction quality.
- `email-integration`: owns Gmail, Office 365, IMAP, SMTP, sync, and mutations.
- `ai-features`: owns Anthropic prompts, fallbacks, summaries, drafts, and priority metadata.
- `test-runner`: owns unit, integration, and Playwright test coverage.
- `deployment-reviewer`: owns Vercel env, build checks, and secret hygiene.

## Skills

- `provider-adapter-design`: keeps provider APIs behind the normalized adapter contract.
- `mobile-pwa-review`: checks responsive layout, manifest, service worker, and installability.
- `ai-email-triage`: designs summary, draft, and priority workflows.
- `security-token-review`: checks token storage, env handling, and no-secret logging.

## Hooks

- `.claude/hooks/env-check.mjs`: validates required env variables for real provider mode.
- `.claude/hooks/pre-test.mjs`: lightweight test readiness check.
- `.claude/hooks/pre-deploy.mjs`: blocks deploys without build-critical env decisions.
- `.claude/hooks/no-secret-commit.mjs`: scans staged-style files for obvious secret patterns.

## Plugins / Tools

- Claude Code CLI for local specs-driven development.
- GitHub for source handoff and Vercel import.
- Vercel for hosting and Postgres integration.
- Playwright for mobile/desktop workflow tests.
- Vitest for unit and integration tests.
- Anthropic API for deployed AI features.
