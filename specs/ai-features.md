# AI Features Spec

## Summary

Generate a concise message summary with sender intent, action requested, and deadline if present.

## Reply Draft

Generate a reply draft in the user's selected tone. Drafts are inserted into compose state for review and never sent automatically.

## Priority

Score messages as `urgent`, `high`, `normal`, or `low` using sender, deadline language, direct requests, unread state, and thread recency. Anthropic is used in production when configured. Deterministic scoring is used as fallback and in tests.

## Privacy

Only the selected message content is sent to the AI provider for summary/draft. Bulk prioritization sends minimal subject, sender, snippet, labels, and dates.
