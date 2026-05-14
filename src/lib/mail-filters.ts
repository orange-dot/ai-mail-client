import type { EmailMessage, MailFilter } from "./types";

export function filterMessages(messages: EmailMessage[], filter: MailFilter): EmailMessage[] {
  const normalizedQuery = filter.query?.trim().toLowerCase();

  return messages
    .filter((message) => filter.includeArchived || !message.flags.archived)
    .filter((message) => !message.flags.deleted)
    .filter((message) => !filter.accountId || message.accountId === filter.accountId)
    .filter((message) => !filter.label || message.labels.includes(filter.label))
    .filter((message) => {
      if (!normalizedQuery) return true;
      const haystack = [
        message.subject,
        message.from.name,
        message.from.email,
        message.snippet,
        message.bodyText,
        message.labels.join(" ")
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    })
    .sort((a, b) => Date.parse(b.receivedAt) - Date.parse(a.receivedAt));
}
