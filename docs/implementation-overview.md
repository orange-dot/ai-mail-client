# Conductor Mail Implementation Overview

## What Was Built

Conductor Mail is a Next.js + TypeScript mobile-ready PWA for an AI-first universal email client. The implemented product is email-only and includes:

- Unified inbox across Gmail, Office 365, and IMAP-style accounts.
- Account switching and per-account filtering.
- Search, labels, archive, delete, read/unread state, compose, reply, and forward UX.
- AI summaries, AI reply drafts, and AI prioritization.
- Demo-mode mailbox so the app is usable before real provider credentials exist.
- Real backend adapter boundaries for Gmail API, Microsoft Graph Mail, IMAP, SMTP, and Anthropic.
- Claude Code / Agent OS deliverables: `CLAUDE.md`, specs, architecture doc, workflow doc, agents, skills, hooks, tests, and Vercel config.

The app lives at:

```text
workspace/product/ai-mail-client
```

Local dev server currently runs on:

```text
http://127.0.0.1:3001
```

## Specs-Driven Development Flow

The implementation was intentionally driven from specs before code. The important files are:

```text
specs/product.md
specs/email-adapters.md
specs/ai-features.md
docs/architecture.md
docs/workflow.md
docs/agents-skills-hooks-plugins.md
CLAUDE.md
```

The sequence was:

1. Define the product scope in `specs/product.md`.
   - Email client only.
   - No contacts, tasks, notes, or calendar.
   - Required UX: unified inbox, account switcher, compose/reply/forward, search, labels, archive/delete.
   - Required AI: summary, reply draft, prioritization.

2. Define provider contracts in `specs/email-adapters.md`.
   - All provider-specific behavior must sit behind `MailProviderAdapter`.
   - Gmail labels, Microsoft categories/folders, and IMAP folders/flags normalize into one app model.
   - API routes should not directly know provider-specific protocol details.

3. Define AI behavior in `specs/ai-features.md`.
   - Summary returns a concise sender-intent/deadline statement.
   - Reply draft is review-only and never auto-sends.
   - Priority uses `urgent`, `high`, `normal`, and `low`.
   - Anthropic is used when configured; deterministic fallback is used for demo/test.

4. Implement the architecture from those specs.
   - Shared domain model in `src/lib/types.ts`.
   - Demo mailbox in `src/lib/demo-data.ts`.
   - Provider adapters in `src/server/mail/adapters/`.
   - AI functions in `src/server/ai/`.
   - API routes in `src/app/api/`.
   - PWA UI in `src/components/MailApp.tsx`.

5. Add tests against the spec boundaries.
   - Unit tests for filtering, crypto, MIME generation, provider normalization, and priority scoring.
   - Playwright tests for inbox/search/AI draft/compose/account-switch/archive workflows.

## Runtime Architecture

### UI Layer

Main UI file:

```text
src/components/MailApp.tsx
```

It renders:

- Left mailbox/account/label navigation.
- Message list.
- Reading pane.
- AI summary/draft panel.
- Compose sheet.
- Mobile reader state.

The first screen is the inbox, not a landing page. This matches the assignment requirement to judge product quality rather than marketing copy.

### Domain Model

Main shared types:

```text
src/lib/types.ts
```

Important normalized types:

- `EmailAccount`
- `EmailMessage`
- `MailLabel`
- `ComposePayload`
- `MailProvider`
- `MailPriority`

This keeps the UI independent from Gmail/Microsoft/IMAP-specific response shapes.

### Demo Data

Demo mailbox:

```text
src/lib/demo-data.ts
```

Demo mode exists so the Vercel app can be reviewed immediately without OAuth app registrations, Postgres, or IMAP credentials. It includes sample Gmail, Office 365, and Yahoo IMAP accounts.

### API Routes

Implemented routes:

```text
src/app/api/accounts/route.ts
src/app/api/accounts/imap/route.ts
src/app/api/connect/[provider]/route.ts
src/app/api/connect/[provider]/callback/route.ts
src/app/api/mail/route.ts
src/app/api/mail/[id]/route.ts
src/app/api/mail/send/route.ts
src/app/api/ai/summary/route.ts
src/app/api/ai/draft/route.ts
src/app/api/ai/prioritize/route.ts
```

These routes provide the backend surface for accounts, OAuth connect, IMAP connect, mailbox reads, mutations, send, and AI actions.

## Provider Integration

Provider contract:

```text
src/server/mail/adapters/types.ts
```

Provider implementations:

```text
src/server/mail/adapters/gmail.ts
src/server/mail/adapters/microsoft.ts
src/server/mail/adapters/imap.ts
```

### Gmail

Implemented through Gmail API concepts:

- OAuth connect URL generation.
- OAuth callback token exchange.
- Gmail message listing.
- Gmail message normalization.
- Gmail send via base64url MIME payload.
- Gmail archive/delete/label mutations.

### Office 365

Implemented through Microsoft Graph concepts:

- OAuth connect URL generation.
- OAuth callback token exchange.
- Graph message listing.
- Graph message normalization.
- Graph send/reply/forward.
- Graph archive/delete/category mutations.

### IMAP / Yahoo / AOL

Implemented through:

- `imapflow` for reading, flags, archive/delete style operations.
- `nodemailer` for SMTP sending.
- `/api/accounts/imap` endpoint for saving IMAP/SMTP credentials.

In real provider mode, IMAP credentials should be app passwords where required by Yahoo/AOL.

## AI Implementation

Main AI code:

```text
src/server/ai/anthropic.ts
src/server/ai/priority.ts
```

### Summary Flow

1. User clicks `Summary` in the message reader.
2. UI calls:

```text
POST /api/ai/summary
```

3. Route loads the message.
4. `summarizeMessage()` runs.
5. If `ANTHROPIC_API_KEY` exists, the app calls Anthropic `/v1/messages`.
6. If no key exists, the app returns deterministic fallback text.

Current local test uses:

```text
ANTHROPIC_MODEL=claude-sonnet-4-20250514
```

The direct endpoint test succeeded with a real Anthropic response.

### Reply Draft Flow

1. User clicks `Draft`.
2. UI calls:

```text
POST /api/ai/draft
```

3. Backend drafts a reply using Anthropic or fallback.
4. Draft is inserted into the compose sheet.
5. User must review and manually send.

The app never auto-sends AI output.

### Prioritization Flow

1. User clicks the sparkle/prioritize action.
2. UI calls:

```text
POST /api/ai/prioritize
```

3. Backend scores messages.
4. Messages are sorted by `urgent`, `high`, `normal`, `low`.

The current production path uses deterministic scoring as the reliable baseline. Anthropic can be expanded later for bulk priority reasoning.

## Persistence And Security

Database schema:

```text
src/server/db/schema.sql
```

Repository layer:

```text
src/server/db/repository.ts
```

Credential encryption:

```text
src/server/security/crypto.ts
```

Security behavior:

- OAuth refresh tokens and IMAP credentials are encrypted with AES-256-GCM.
- `TOKEN_ENCRYPTION_KEY` is required for real provider mode.
- Provider credentials are not exposed to the client.
- `.env.local` is ignored by git.
- AI endpoints do not send email.

The local test Anthropic key was written only to:

```text
.env.local
```

That file should be deleted after testing and the key should be rotated.

## Claude Code / Agent OS Artifacts

Project guidance:

```text
CLAUDE.md
```

Agents:

```text
.claude/agents/product-planner.md
.claude/agents/frontend-ux.md
.claude/agents/email-integration.md
.claude/agents/ai-features.md
.claude/agents/test-runner.md
.claude/agents/deployment-reviewer.md
```

Skills:

```text
.claude/skills/provider-adapter-design.md
.claude/skills/mobile-pwa-review.md
.claude/skills/ai-email-triage.md
.claude/skills/security-token-review.md
```

Hooks:

```text
.claude/hooks/env-check.mjs
.claude/hooks/pre-test.mjs
.claude/hooks/pre-deploy.mjs
.claude/hooks/no-secret-commit.mjs
```

These artifacts document the intended Claude Code discipline even though the actual implementation here was executed through Codex in this workspace.

## PWA Implementation

PWA files:

```text
public/manifest.webmanifest
public/sw.js
public/icon.svg
```

Next metadata is in:

```text
src/app/layout.tsx
```

The app supports installability basics:

- Manifest.
- App icon.
- Theme color.
- Service worker.
- Offline fallback for cached shell assets.

## Hydration Fix

A browser extension injected this attribute into `<body>`:

```text
cz-shortcut-listen="true"
```

That caused a React hydration warning. The fix was:

```tsx
<body suppressHydrationWarning>{children}</body>
```

Additionally, message timestamp formatting was made deterministic with explicit locale/timezone so server and client render the same text.

## Validation Performed

Commands that passed:

```bash
npm run env:check
npm run lint
npm run typecheck
npm test
npm run check
npm run build
npm run test:e2e
npm audit --omit=dev
```

Test coverage:

- 5 unit test files.
- 11 unit tests.
- Playwright mobile/desktop flow tests.
- Production dependency audit with 0 vulnerabilities.

Playwright result:

- Inbox search + AI draft + compose passed on desktop.
- Inbox search + AI draft + compose passed on mobile.
- Account switch + archive passed on desktop.
- Mobile skip is intentional because that test targets the desktop account rail.

## Deployment Plan

Vercel config:

```text
vercel.json
```

Deploy path:

1. Create a GitHub repo from `workspace/product/ai-mail-client`.
2. Import that GitHub repo into Vercel.
3. Configure env vars from `.env.example`.
4. Use:

```text
Build command: npm run build
Install command: npm install
Framework: Next.js
```

Required real-mode variables:

```text
POSTGRES_URL
TOKEN_ENCRYPTION_KEY
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
MICROSOFT_CLIENT_ID
MICROSOFT_CLIENT_SECRET
ANTHROPIC_API_KEY
ANTHROPIC_MODEL
NEXT_PUBLIC_APP_URL
APP_ACCESS_TOKEN
```

For reviewer-friendly demo mode:

```text
DEMO_MODE=true
ANTHROPIC_API_KEY=<optional, enables real AI>
ANTHROPIC_MODEL=claude-sonnet-4-20250514
```

## Current Limitations

- Gmail and Microsoft OAuth require real app registrations before production use.
- IMAP requires real mailbox credentials/app passwords.
- Persistence falls back to demo data unless `POSTGRES_URL` is configured.
- Provider sync scheduling is not implemented yet; current shape supports manual/API-driven sync expansion.
- Bulk Anthropic prioritization is intentionally conservative and currently uses deterministic scoring as the stable baseline.

## Files Most Worth Reviewing

```text
src/components/MailApp.tsx
src/lib/types.ts
src/server/ai/anthropic.ts
src/server/mail/adapters/types.ts
src/server/mail/adapters/gmail.ts
src/server/mail/adapters/microsoft.ts
src/server/mail/adapters/imap.ts
src/app/api/ai/summary/route.ts
docs/architecture.md
docs/workflow.md
CLAUDE.md
```
