import { describe, expect, it } from "vitest";
import { buildFallbackSummary } from "./summary-fallback";
import type { EmailMessage } from "@/lib/types";

function makeMessage(overrides: Partial<EmailMessage>): EmailMessage {
  return {
    id: "m-1",
    providerMessageId: "p-1",
    threadId: "t-1",
    accountId: "a-1",
    provider: "imap",
    subject: "Subject",
    from: { name: "Alex Doe", email: "alex@example.com" },
    to: [{ email: "me@example.com" }],
    receivedAt: new Date().toISOString(),
    snippet: "",
    bodyText: "",
    labels: [],
    flags: { unread: true },
    priority: "normal",
    ...overrides
  };
}

describe("buildFallbackSummary", () => {
  it("surfaces a deadline phrase when the body has one", () => {
    const message = makeMessage({
      subject: "Security deadline today",
      from: { name: "Alex Doe", email: "alex@example.com" },
      snippet: "Please confirm ASAP",
      bodyText: "Please review before 15:00."
    });

    const summary = buildFallbackSummary(message);

    expect(summary.length).toBeGreaterThan(0);
    expect(summary).toContain("Alex Doe");
    expect(summary.toLowerCase()).toContain("15:00");
  });

  it("mentions the action verb when no deadline is present", () => {
    const message = makeMessage({
      subject: "Quick question",
      from: { name: "Sam Reviewer", email: "sam@example.com" },
      snippet: "Can you confirm the address?",
      bodyText: "Can you confirm the address? Thanks."
    });

    const summary = buildFallbackSummary(message);

    expect(summary.length).toBeGreaterThan(0);
    expect(summary).toContain("Sam Reviewer");
    expect(summary.toLowerCase()).toContain("confirm");
    expect(summary.toLowerCase()).not.toMatch(/\bdeadline:\s*\b/);
  });

  it("still produces a non-empty summary for a digest with no action or deadline", () => {
    const message = makeMessage({
      subject: "Weekly digest",
      from: { name: "Newsletter Bot", email: "digest@example.com" },
      snippet: "A digest of links",
      bodyText: "A digest of links from the past week."
    });

    const summary = buildFallbackSummary(message);

    expect(summary.length).toBeGreaterThan(0);
    expect(summary).toContain("Newsletter Bot");
    expect(summary.toLowerCase()).not.toMatch(/\bdeadline:\s*\b/);
  });
});
