# demo-mode-parity

The `dev` branch target is **demo-mode parity with `main`**. The PWA must remain fully usable with:

```
DEMO_MODE=true
ANTHROPIC_API_KEY=<unset or set>
```

— and without any of `POSTGRES_URL`, `GOOGLE_CLIENT_ID/SECRET`, `MICROSOFT_CLIENT_ID/SECRET`, `TOKEN_ENCRYPTION_KEY`.

Implications for every cooperation:

- Any code path that fails when an env var is missing must fall back to demo data instead of erroring.
- AI summary / draft / priority must keep their deterministic fallback path. Spec invariant from `specs/ai-features.md`.
- Provider routes (`/api/connect/*`, `/api/accounts/*`, `/api/mail/*`) must keep working against the in-memory demo mailbox in `src/lib/demo-data.ts`.
- New env vars added in a cooperation must come with a sensible default for demo mode and must be added to `.env.example`.
- The `env-check.mjs` hook prints `DEMO_MODE=true; provider credentials may be omitted.` and exits 0 — that's the contract.

Out of scope on `dev` (deferred to a separate cooperation if ever needed):

- Real Gmail / Microsoft OAuth app registration.
- Real Postgres provisioning.
- Real-mode-only error paths.

The `deployment-reviewer` agent flags any cooperation that would break demo-mode parity at `claude_review` time, not at `claude_final`. Catch it early.
