# Email Adapter Spec

All providers implement `MailProviderAdapter`.

## Operations

- `listMessages`: fetch normalized inbox/search results.
- `getMessage`: fetch one normalized message.
- `send`: send a new message.
- `reply`: send a reply in the thread context.
- `forward`: forward a message.
- `archive`: remove from inbox without deleting.
- `delete`: delete or trash the message.
- `applyLabel`: add a label/category/folder marker.
- `removeLabel`: remove a label/category/folder marker.

## Provider Mapping

- Gmail labels map to normalized labels.
- Microsoft categories and well-known folders map to normalized labels.
- IMAP folders and flags map to normalized labels and flags.
- Provider message IDs remain stored as `providerMessageId`.

## Error Behavior

Adapters return typed errors with `provider`, `operation`, `retryable`, and `message`. API routes convert them to stable JSON errors.
