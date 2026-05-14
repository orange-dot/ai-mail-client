# Assignment Reply Template

Live URL: `<add Vercel URL after GitHub import>`

Repository: `<add GitHub URL>`

Deliverables:

- `CLAUDE.md`
- `docs/architecture.md`
- `docs/agents-skills-hooks-plugins.md`
- `docs/workflow.md`
- `specs/product.md`
- `specs/email-adapters.md`
- `specs/ai-features.md`

Validation:

- `npm run env:check`
- `npm run check`
- `npm run build`
- `npm run test:e2e`
- `npm audit --omit=dev`

Notes:

- Demo mode is enabled until Vercel env vars are configured.
- Real provider mode requires Google OAuth, Microsoft OAuth, Postgres, `TOKEN_ENCRYPTION_KEY`, and `ANTHROPIC_API_KEY`.
