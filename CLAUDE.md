# CLAUDE.md

This project is built with a Claude Code / Agent OS workflow.

## Mission

Ship an AI-first universal email client PWA for Gmail, Office 365, and IMAP accounts. The product is email-only: unified inbox, account switching, compose, reply, forward, search, labels, archive, delete, AI summaries, AI reply drafts, and prioritization.

## Operating Method

1. Start from `specs/product.md`, then check provider and AI specs before editing.
2. Use the smallest agent role that fits the change:
   - product-planner for requirements and acceptance criteria.
   - frontend-ux for mobile inbox, compose, and reading flows.
   - email-integration for provider adapters and token handling.
   - ai-features for prompts, fallbacks, and AI metadata.
   - test-runner for unit, integration, and Playwright coverage.
   - deployment-reviewer for Vercel, env, and security checks.
3. Keep provider-specific code behind `MailProviderAdapter`.
4. Preserve the single-user demo boundary unless the spec is updated.
5. Run `npm run check` before handoff and `npm run test:e2e` after visible UI changes.

## Safety

- Never log OAuth tokens, IMAP passwords, Anthropic API keys, or raw message bodies in production routes.
- Store provider secrets encrypted with `TOKEN_ENCRYPTION_KEY`.
- AI endpoints may summarize or draft from email content, but they must not send mail.
- The app must remain usable in demo mode when external provider credentials are absent.

## Delivery Checklist

- Live Vercel URL.
- `CLAUDE.md`.
- `docs/architecture.md`.
- `docs/agents-skills-hooks-plugins.md`.
- `docs/workflow.md`.
- Automated tests and validation command output.
