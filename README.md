# Conductor Mail

AI-first universal email client PWA for the assignment.

## Live Delivery

- Live Vercel app: https://ai-mail-client-tawny.vercel.app
- Repository: https://github.com/orange-dot/ai-mail-client
- Claude Code discipline: [CLAUDE.md](CLAUDE.md)
- One-page architecture: [docs/architecture.md](docs/architecture.md)
- Agents, skills, hooks, plugins: [docs/agents-skills-hooks-plugins.md](docs/agents-skills-hooks-plugins.md)
- Workflow writeup: [docs/workflow.md](docs/workflow.md)
- Final submission summary: [docs/final-delivery-template.md](docs/final-delivery-template.md)

## Local Commands

- `npm install`
- `npm run dev`
- `npm run check`
- `npm run test:e2e`
- `npm run build`

## Deployment

Import the GitHub repo into Vercel, set the variables from `.env.example`, and use:

- Build command: `npm run build`
- Install command: `npm install`
- Output: Next.js default

The UI is usable in `DEMO_MODE=true` with no external services. Gmail and Anthropic can also be tried on a credential-free deploy through the in-app setup screen: each visitor supplies their own Google OAuth app credentials and Anthropic API key, stored in an encrypted per-browser httpOnly cookie. Server environment variables remain the preferred production path for shared real-mode deployments.
