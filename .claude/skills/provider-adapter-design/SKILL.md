---
name: provider-adapter-design
description: Apply when adding, changing, or reviewing provider behavior across Gmail (Gmail API), Office 365 (Microsoft Graph), or IMAP/SMTP. Keeps provider-specific protocol details behind src/server/mail/adapters/types.ts MailProviderAdapter. Triggers on edits to src/server/mail/adapters/, src/server/auth/oauth.ts, src/app/api/connect/, src/app/api/mail/.
---

# provider-adapter-design

Source of truth: `specs/email-adapters.md`.

## When to invoke

- A cooperation plan mentions adding a provider, changing list/get/send/reply/forward/archive/delete/applyLabel behavior, or normalizing protocol concepts.
- An adapter-shaped test fails.
- Reviewer or test-runner finds protocol detail leaking into an API route.

## Contract invariants

1. `MailProviderAdapter` (in `src/server/mail/adapters/types.ts`) is the single boundary.
2. API routes in `src/app/api/mail/*` never import provider SDKs. They use `src/server/mail/provider-registry.ts`.
3. Provider concepts normalize to the app model:
   - Gmail labels → `MailLabel[]`.
   - Microsoft categories + folder → `MailLabel[]`.
   - IMAP folder + flags → `MailLabel[]`.
4. Send paths use `src/server/mail/mime.ts` for MIME assembly. Gmail uses base64url; Microsoft uses Graph payload; IMAP uses nodemailer SMTP.
5. OAuth refresh tokens and IMAP passwords pass through `src/server/security/crypto.ts` AES-256-GCM. Never logged in cleartext.

## Checklist

- [ ] New methods land on the `MailProviderAdapter` interface first.
- [ ] All three implementations (gmail.ts, microsoft.ts, imap.ts) updated or explicitly skipped with justification.
- [ ] `src/server/mail/adapters/normalization.test.ts` updated.
- [ ] Demo mailbox in `src/lib/demo-data.ts` still produces sane output for the change.
- [ ] No SDK import outside `src/server/mail/adapters/*`.

## Anti-patterns

- API route doing protocol-specific work in a `switch (provider)` block.
- Provider-specific field bleeding into `EmailMessage` in `src/lib/types.ts`.
- Send paths skipping the MIME helper.
- Credentials stored in plaintext anywhere.
