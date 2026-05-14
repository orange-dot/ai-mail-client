# Product Spec

## Goal

Build a mobile-ready AI-first universal email client PWA for Gmail, Office 365, and IMAP accounts. The product is email-only.

## Required Capabilities

- Unified inbox across connected accounts.
- Account switching and per-account filtering.
- Compose, reply, forward, archive, delete, labels, and read/unread state.
- Search across normalized message fields.
- AI summary, AI reply draft, and AI priority scoring.
- PWA installability and responsive mobile/desktop layout.

## Out Of Scope

- Contacts.
- Tasks.
- Notes.
- Calendar.
- Multi-user team administration.

## Acceptance Criteria

- App loads directly into the inbox.
- Demo mode works without provider credentials.
- Real provider mode has Gmail OAuth, Microsoft OAuth, and IMAP/SMTP connection paths.
- All provider actions route through the adapter contract.
- AI drafts are review-only and never auto-send.
- Unit tests cover security, filtering, MIME, and priority behavior.
- Playwright covers inbox, account switch, search, AI draft, and compose.
