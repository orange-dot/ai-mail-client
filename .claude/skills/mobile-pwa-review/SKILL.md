---
name: mobile-pwa-review
description: Apply when changing UI layout, manifest, service worker, icons, theme color, or any path affecting PWA installability and mobile usability. Triggers on edits to src/components/MailApp.tsx, src/app/layout.tsx, src/app/globals.css, public/manifest.webmanifest, public/sw.js, public/icon.svg.
---

# mobile-pwa-review

Source of truth: `specs/product.md` mobile + PWA invariants.

## When to invoke

- A cooperation plan touches the UI shell, navigation, reader pane, compose sheet, or account rail.
- Manifest, icon, theme color, or service worker changes are proposed.
- Hydration warnings show up.

## Invariants

1. First visible screen on `/` is the inbox, not a landing page.
2. Mobile-first: reader and compose work cleanly at 360 px wide.
3. Account rail behavior is intentionally desktop-shaped — Playwright mobile project skips account rail tests, that is on purpose.
4. Timestamp rendering is deterministic: explicit locale + timezone, same string on server and client.
5. `<body suppressHydrationWarning>` stays because browser extensions inject `cz-shortcut-listen`. Do not remove it.
6. Manifest invariants: `start_url=/`, theme color matches `next.config.mjs` security headers, icon at `public/icon.svg`.
7. Service worker registration must not block first paint.

## Checklist

- [ ] Visual change verified at 360 px and 1280 px.
- [ ] No new hydration warnings in dev console.
- [ ] Playwright desktop project still passes on touched flows.
- [ ] Playwright mobile project still passes on touched flows (excluding the intentional account-rail skip).
- [ ] If touching `public/sw.js`, the offline shell cache list is still valid.

## Anti-patterns

- Adding a marketing landing page before the inbox.
- Hard-coding timestamps with implicit locale.
- Removing `suppressHydrationWarning` from body.
- Inlining icons instead of using `public/icon.svg`.
