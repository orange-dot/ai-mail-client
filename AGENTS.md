# Repository Guidelines

This child project is a standalone Next.js PWA inside the lab workspace.

## Commands

- `npm run dev`: local app at `127.0.0.1:3000`.
- `npm run check`: lint, typecheck, and unit tests.
- `npm run test:e2e`: Playwright mobile and desktop flows.
- `npm run build`: production build for Vercel.

## Project Rules

- Keep email provider behavior behind `MailProviderAdapter`.
- Do not commit provider secrets, OAuth tokens, IMAP passwords, database dumps, or generated test reports.
- Any new provider action must update the adapter contract, API route, and tests.
- UI must stay mobile-first and email-only: no contacts, tasks, notes, or calendar features.

## Validation

Run `npm run check` after code changes. Run `npm run test:e2e` after UI, routing, or PWA changes.
