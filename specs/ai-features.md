# AI Features Spec

## Summary

Generate a concise message summary with sender intent, action requested, and deadline if present.

## Reply Draft

Generate a reply draft in the user's selected tone. Drafts are inserted into compose state for review and never sent automatically.

## Priority

Score messages as `urgent`, `high`, `normal`, or `low` using sender, deadline language, direct requests, unread state, and thread recency. Anthropic is used in production when configured. Deterministic scoring is used as fallback and in tests.

## Configuration

The Anthropic API key may come from server environment configuration or from an in-app, per-browser-session entry. "Configured" in this spec means either source is present. When no key is available from either source, the deterministic fallback path is used.

## Privacy

Only the selected message content is sent to the AI provider for summary/draft. Bulk prioritization sends minimal subject, sender, snippet, labels, and dates. A session-supplied AI key is used only to call the AI provider; it is never logged and never returned to the client.
