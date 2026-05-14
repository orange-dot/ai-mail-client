# Workflow Writeup

The project follows a specs-first Claude Code workflow.

1. Product intent is captured in `specs/product.md`.
2. Provider behavior is constrained by `specs/email-adapters.md`.
3. AI behavior is constrained by `specs/ai-features.md`.
4. Each implementation pass uses a focused agent role from `docs/agents-skills-hooks-plugins.md`.
5. Hooks check env readiness, deploy readiness, and secret hygiene.
6. Validation runs through `npm run check`, then Playwright for visible UX changes.

The development loop is:

```bash
npm install
npm run env:check
npm run dev
npm run check
npm run test:e2e
npm run build
```

Deployment loop:

```bash
git push origin main
# Import the GitHub repo in Vercel.
# Set variables from .env.example.
npm run predeploy
```

Final assignment reply should include the Vercel URL, this repository path, validation results, and links/paths to `CLAUDE.md`, `docs/architecture.md`, `docs/agents-skills-hooks-plugins.md`, and this workflow writeup.
