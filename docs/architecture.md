# Conductor Mail Architecture

Conductor Mail is a single-user, mobile-ready Next.js PWA with a unified email domain model over Gmail, Office 365, and IMAP providers. The app keeps provider-specific behavior in server-side adapters and exposes one mail API to the UI.

## System Shape

- **Client:** Next.js App Router UI with responsive inbox, message reader, account switcher, compose sheet, labels, search, and AI actions.
- **API:** Route handlers under `/api/accounts`, `/api/connect`, `/api/mail`, and `/api/ai`.
- **Persistence:** Vercel Postgres/Neon stores accounts, encrypted credentials, normalized message cache, labels, and AI metadata.
- **Providers:** Gmail API, Microsoft Graph Mail API, and IMAP/SMTP share the `MailProviderAdapter` contract.
- **AI:** Anthropic API generates summaries, reply drafts, and priority scores. Deterministic fallbacks keep demo/test mode stable.

## Data Flow

1. A user connects Gmail, Office 365, or IMAP.
2. OAuth refresh tokens or IMAP credentials are encrypted server-side and persisted.
3. Provider adapters sync messages into the normalized cache.
4. The UI reads `/api/mail` for a unified inbox, optionally filtered by account, label, or query.
5. Mutations route through `/api/mail/[id]` and are applied both to the provider and local cache.
6. AI endpoints read normalized message content, call Anthropic when configured, and store insight metadata.

## Security Model

- `TOKEN_ENCRYPTION_KEY` protects stored credentials with AES-256-GCM.
- Provider secrets live only in Vercel environment variables.
- `APP_ACCESS_TOKEN` can gate the single-user production demo.
- AI endpoints never send email; they return drafts or metadata for user review.

## Deployment

The project deploys directly to Vercel from GitHub. Required production services are Vercel Postgres/Neon plus OAuth apps for Google and Microsoft. IMAP accounts require host, port, username, password/app-password, and SMTP settings.
