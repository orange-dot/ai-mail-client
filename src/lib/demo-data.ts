import type { EmailAccount, EmailMessage, MailLabel, MailSnapshot } from "./types";

export const demoAccounts: EmailAccount[] = [
  {
    id: "acct-gmail",
    provider: "gmail",
    address: "bojan.product@gmail.com",
    displayName: "Gmail",
    status: "demo",
    unreadCount: 3,
    color: "#2f6f64",
    lastSyncedAt: "2026-05-14T08:20:00.000Z"
  },
  {
    id: "acct-o365",
    provider: "microsoft365",
    address: "bojan@company.test",
    displayName: "Office 365",
    status: "demo",
    unreadCount: 2,
    color: "#d95f43",
    lastSyncedAt: "2026-05-14T08:18:00.000Z"
  },
  {
    id: "acct-imap",
    provider: "imap",
    address: "bojan@yahoo.test",
    displayName: "Yahoo IMAP",
    status: "demo",
    unreadCount: 1,
    color: "#5b5f97",
    lastSyncedAt: "2026-05-14T08:12:00.000Z"
  }
];

export const demoLabels: MailLabel[] = [
  { id: "inbox", name: "Inbox", color: "#2f6f64", system: true },
  { id: "priority", name: "Priority", color: "#d95f43", system: true },
  { id: "work", name: "Work", color: "#4062bb" },
  { id: "travel", name: "Travel", color: "#f2c14e" },
  { id: "finance", name: "Finance", color: "#6f4e7c" }
];

export const demoMessages: EmailMessage[] = [
  {
    id: "msg-1",
    providerMessageId: "gmail-001",
    threadId: "thread-001",
    accountId: "acct-gmail",
    provider: "gmail",
    subject: "Claude Code assignment follow-up",
    from: { name: "Taj", email: "taj@aptask.test" },
    to: [{ name: "Bojan", email: "bojan.product@gmail.com" }],
    receivedAt: "2026-05-14T08:05:00.000Z",
    snippet: "Please send the Vercel URL, architecture doc, workflow writeup, and test summary when ready.",
    bodyText:
      "Hi Bojan,\n\nPlease send the Vercel URL, CLAUDE.md, architecture doc, workflow writeup, agent list, and test summary when the AI-first email client is ready.\n\nRegards,\nTaj",
    labels: ["inbox", "priority", "work"],
    flags: { unread: true },
    priority: "urgent",
    aiSummary: "Taj is asking for the full assignment delivery package after the email client is complete.",
    aiRationale: "Direct request, explicit deliverables, and evaluation context."
  },
  {
    id: "msg-2",
    providerMessageId: "o365-041",
    threadId: "thread-041",
    accountId: "acct-o365",
    provider: "microsoft365",
    subject: "Vendor security questionnaire",
    from: { name: "Mira Security", email: "mira@vendor.test" },
    to: [{ email: "bojan@company.test" }],
    receivedAt: "2026-05-14T07:42:00.000Z",
    snippet: "Can you review the token storage notes before 15:00?",
    bodyText:
      "Can you review the token storage notes before 15:00 and confirm whether AES-GCM is used for OAuth refresh tokens?",
    labels: ["inbox", "work"],
    flags: { unread: true },
    priority: "high",
    aiSummary: "Mira needs confirmation about token storage before 15:00."
  },
  {
    id: "msg-3",
    providerMessageId: "imap-019",
    threadId: "thread-019",
    accountId: "acct-imap",
    provider: "imap",
    subject: "Flight receipt",
    from: { name: "Airline Receipts", email: "receipts@airline.test" },
    to: [{ email: "bojan@yahoo.test" }],
    receivedAt: "2026-05-13T19:10:00.000Z",
    snippet: "Your May 21 flight receipt and booking reference are attached.",
    bodyText: "Your May 21 flight receipt and booking reference are attached. Booking code DEMO42.",
    labels: ["inbox", "travel", "finance"],
    flags: { unread: false },
    priority: "normal",
    attachments: [{ id: "att-1", filename: "receipt.pdf", contentType: "application/pdf", size: 83422 }]
  },
  {
    id: "msg-4",
    providerMessageId: "gmail-002",
    threadId: "thread-002",
    accountId: "acct-gmail",
    provider: "gmail",
    subject: "Weekly product metrics",
    from: { name: "Metrics Bot", email: "metrics@company.test" },
    to: [{ email: "bojan.product@gmail.com" }],
    receivedAt: "2026-05-13T15:35:00.000Z",
    snippet: "Activation is up 6.4%, mobile compose completion is down 2.1%.",
    bodyText: "Activation is up 6.4%, mobile compose completion is down 2.1%, and search latency is stable.",
    labels: ["inbox", "work"],
    flags: { unread: false },
    priority: "normal"
  },
  {
    id: "msg-5",
    providerMessageId: "o365-042",
    threadId: "thread-042",
    accountId: "acct-o365",
    provider: "microsoft365",
    subject: "Old onboarding checklist",
    from: { name: "People Ops", email: "people@company.test" },
    to: [{ email: "bojan@company.test" }],
    receivedAt: "2026-05-10T12:00:00.000Z",
    snippet: "Archived reference copy for the onboarding checklist.",
    bodyText: "Archived reference copy for the onboarding checklist.",
    labels: ["work"],
    flags: { unread: false, archived: true },
    priority: "low"
  }
];

export function getDemoMailSnapshot(): MailSnapshot {
  return {
    accounts: demoAccounts,
    labels: demoLabels,
    messages: demoMessages
  };
}
