# Conductor Mail Architecture

Conductor Mail is a mobile-ready Next.js PWA for an AI-first, email-only inbox. It presents one normalized mailbox UI while keeping Gmail, Microsoft 365, IMAP/SMTP, and AI-provider behavior behind server-side boundaries.

## System Shape

- **Client:** Next.js App Router UI with responsive inbox, message reader, account switcher, compose/reply sheet, labels, search, and AI actions.
- **API:** Route handlers under `/api/accounts`, `/api/connect`, `/api/mail`, `/api/ai`, and `/api/settings/credentials`.
- **Persistence:** Vercel Postgres/Neon stores connected accounts, encrypted provider credentials, normalized messages, labels, and AI metadata when `POSTGRES_URL` is configured.
- **Providers:** Gmail API, Microsoft Graph Mail API, and IMAP/SMTP share the `MailProviderAdapter` contract so routes and UI do not branch on provider protocol details.
- **AI:** Anthropic generates summaries and reply drafts when configured; deterministic fallbacks keep demo and test mode stable.

## Data Flow

1. The app boots from demo data when `DEMO_MODE=true` or persistence/provider credentials are absent.
2. A reviewer can open the deployed app immediately, then optionally add Google OAuth app credentials or an Anthropic API key in the setup screen.
3. Per-browser BYO credentials are encrypted with the same server crypto boundary and stored in an httpOnly cookie; server env vars remain the fallback and production default.
4. OAuth or IMAP account credentials are encrypted server-side before persistence, then adapters sync provider messages into the normalized cache.
5. The UI reads `/api/mail` for a unified inbox and sends mutations through `/api/mail/[id]`, where the server updates the provider and local cache.
6. AI routes read normalized message content, call Anthropic only when an API key is available, and return review-only summaries or drafts.

## Security Model

- `TOKEN_ENCRYPTION_KEY` protects persisted provider credentials and per-browser BYO credentials with AES-256-GCM.
- Secrets are never returned by the settings route; responses expose only redacted configured/not-configured status.
- OAuth app credentials resolve in this order: per-browser BYO value, then Vercel environment variable.
- `APP_ACCESS_TOKEN` can gate the single-user production demo.
- AI endpoints never send mail; they return draft text or metadata for explicit user review.

## Deployment

The live app is deployed on Vercel at https://ai-mail-client-tawny.vercel.app from the GitHub repository. Demo mode requires no external services. Real shared-provider mode requires Vercel Postgres/Neon, `TOKEN_ENCRYPTION_KEY`, OAuth apps for Google and Microsoft, and optional Anthropic credentials; IMAP accounts require host, port, username, password/app-password, and SMTP settings.
