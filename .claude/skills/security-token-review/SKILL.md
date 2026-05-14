---
name: security-token-review
description: Apply when changing credentials, OAuth, IMAP, env handling, API auth, or any path that touches secrets. Triggers on edits to src/server/security/crypto.ts, src/server/auth/oauth.ts, .env.example, next.config.mjs, src/app/api/connect/.
---

# security-token-review

Source of truth: `specs/product.md` § Security; `docs/architecture.md` § Persistence and security.

## When to invoke

- A cooperation plan touches credential storage, OAuth flow, env var coverage, or API auth.
- A new third-party SDK is introduced that may handle secrets.
- A reviewer suspects secret exposure in logs, error messages, or the client bundle.

## Invariants

1. **AES-256-GCM** is the only at-rest format for OAuth refresh tokens and IMAP passwords. Use `src/server/security/crypto.ts`.
2. `TOKEN_ENCRYPTION_KEY` is required in real-provider mode. Demo mode (`DEMO_MODE=true`) is the only path that may skip it.
3. **Never** put a secret into:
   - A `console.log` / `console.warn` / `console.error` in a production route.
   - A response body returned to the client.
   - A thrown error message that may surface to the client.
   - A `Bash` invocation that prints to terminal in CI logs.
4. `ANTHROPIC_API_KEY`, `GOOGLE_CLIENT_SECRET`, `MICROSOFT_CLIENT_SECRET`, IMAP passwords, refresh tokens are server-only.
5. `.env.local` is git-ignored. The `no-secret-commit.mjs` hook is the safety net, not the contract.
6. `APP_ACCESS_TOKEN` gates any non-public route if used; absence means routes are open (and that must be a deliberate decision).

## Checklist

- [ ] New env vars added to `.env.example` with placeholder values.
- [ ] AES-256-GCM path used for any new credential.
- [ ] No logging of secret values introduced.
- [ ] `next.config.mjs` security headers unchanged (or change explicitly justified).
- [ ] `npm audit --omit=dev` clean.
- [ ] `no-secret-commit.mjs` does not flag the staged change.

## Anti-patterns

- Storing a token "for now" in plaintext.
- Reading `TOKEN_ENCRYPTION_KEY` on the client.
- Adding a new env var without updating `.env.example` and `env-check.mjs`.
- Catching crypto errors and silently continuing.
