# Final Delivery

Live URL: https://ai-mail-client-tawny.vercel.app

Repository: https://github.com/orange-dot/ai-mail-client

## Deliverables

- `CLAUDE.md` - Claude Code operating guide, cooperation phases, commands, roles, skills, hooks, safety rules, and validation checklist.
- `docs/architecture.md` - one-page architecture for the Next.js PWA, provider adapters, persistence, BYO credentials, AI path, and deployment model.
- `docs/agents-skills-hooks-plugins.md` - full catalog of agents, skills, commands, rules, hooks, plugins, and runtime cooperation artifacts.
- `docs/workflow.md` - short workflow writeup covering planning, review, implementation, testing, final review, and Vercel deployment.
- `specs/product.md` - product scope and email-only requirements.
- `specs/email-adapters.md` - mail provider adapter contract and provider behavior boundaries.
- `specs/ai-features.md` - AI summary, draft, prioritization, and fallback behavior.

## Product Notes

- Demo mode is live and usable without external credentials.
- Gmail and Anthropic can be tried on the public deploy through the in-app setup screen; BYO credentials are encrypted per browser session in an httpOnly cookie and never returned to the client.
- Shared production real-mode deployment uses Vercel env vars for Postgres, OAuth apps, encryption, access gating, and Anthropic.

## Validation

- `npm run check` - passed on May 18, 2026: lint, typecheck, and 22 Vitest tests.
- `npm run test:e2e` - passed on May 18, 2026: 6 Playwright tests passed, 2 mobile-inapplicable tests skipped.
- `npm run build` - passed on May 18, 2026 with Next.js production build.
- Live URL smoke check - passed on May 18, 2026: `https://ai-mail-client-tawny.vercel.app` returned HTTP 200 from Vercel.
