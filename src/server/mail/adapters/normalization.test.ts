import { describe, expect, it } from "vitest";
import { normalizeGmailMessage } from "./gmail";
import { normalizeMicrosoftMessage } from "./microsoft";

describe("provider normalization", () => {
  it("normalizes Gmail labels and headers", () => {
    const message = normalizeGmailMessage("acct", {
      id: "g1",
      threadId: "t1",
      labelIds: ["INBOX", "UNREAD"],
      snippet: "Hello",
      internalDate: "1778760000000",
      payload: {
        headers: [
          { name: "Subject", value: "Assignment" },
          { name: "From", value: "Taj <taj@example.com>" },
          { name: "To", value: "bojan@example.com" }
        ],
        body: { data: Buffer.from("Body").toString("base64url") }
      }
    });

    expect(message.provider).toBe("gmail");
    expect(message.flags.unread).toBe(true);
    expect(message.flags.archived).toBe(false);
    expect(message.from.email).toBe("taj@example.com");
    // Gmail label IDs are stored verbatim (case-sensitive), not lowercased.
    expect(message.labels).toEqual(["INBOX", "UNREAD"]);
  });

  it("normalizes Microsoft importance and recipients", () => {
    const message = normalizeMicrosoftMessage("acct", {
      id: "m1",
      conversationId: "c1",
      subject: "Security",
      from: { emailAddress: { address: "mira@example.com", name: "Mira" } },
      toRecipients: [{ emailAddress: { address: "bojan@example.com" } }],
      receivedDateTime: "2026-05-14T08:00:00.000Z",
      bodyPreview: "Please review",
      body: { contentType: "text", content: "Please review" },
      categories: ["Work"],
      isRead: false,
      importance: "high"
    });

    expect(message.priority).toBe("high");
    expect(message.flags.unread).toBe(true);
    expect(message.labels).toEqual(["Work"]);
  });

  it("derives Gmail trash and important flags from raw label casing", () => {
    const message = normalizeGmailMessage("acct", {
      id: "g4",
      threadId: "t4",
      labelIds: ["TRASH", "IMPORTANT"],
      snippet: "Trashed",
      internalDate: "1778760000000",
      payload: {
        headers: [
          { name: "Subject", value: "Old thread" },
          { name: "From", value: "ops@example.com" },
          { name: "To", value: "bojan@example.com" }
        ]
      }
    });

    expect(message.labels).toEqual(["TRASH", "IMPORTANT"]);
    expect(message.flags.deleted).toBe(true);
    expect(message.flags.archived).toBe(true);
    expect(message.priority).toBe("high");
  });

  it("decodes a nested multipart Gmail body and keeps the HTML alternative", () => {
    const message = normalizeGmailMessage("acct", {
      id: "g5",
      threadId: "t5",
      labelIds: ["INBOX"],
      snippet: "snippet fallback",
      internalDate: "1778760000000",
      payload: {
        mimeType: "multipart/mixed",
        headers: [
          { name: "Subject", value: "Newsletter" },
          { name: "From", value: "news@example.com" },
          { name: "To", value: "bojan@example.com" }
        ],
        parts: [
          {
            mimeType: "multipart/alternative",
            parts: [
              { mimeType: "text/plain", body: { data: Buffer.from("Plain body text").toString("base64url") } },
              { mimeType: "text/html", body: { data: Buffer.from("<p>HTML body</p>").toString("base64url") } }
            ]
          }
        ]
      }
    });

    expect(message.bodyText).toBe("Plain body text");
    expect(message.bodyHtml).toBe("<p>HTML body</p>");
  });

  it("falls back to tag-stripped HTML when a Gmail message has no plain part", () => {
    const message = normalizeGmailMessage("acct", {
      id: "g6",
      threadId: "t6",
      labelIds: ["INBOX"],
      snippet: "snippet fallback",
      internalDate: "1778760000000",
      payload: {
        mimeType: "multipart/alternative",
        headers: [
          { name: "Subject", value: "HTML only" },
          { name: "From", value: "promo@example.com" },
          { name: "To", value: "bojan@example.com" }
        ],
        parts: [
          { mimeType: "text/html", body: { data: Buffer.from("<p>Hello <b>world</b></p>").toString("base64url") } }
        ]
      }
    });

    expect(message.bodyText).toBe("Hello world");
    expect(message.bodyHtml).toBe("<p>Hello <b>world</b></p>");
  });

  it("drops an RFC 2047 encoded-word display name but keeps the address", () => {
    const message = normalizeGmailMessage("acct", {
      id: "g7",
      threadId: "t7",
      labelIds: ["INBOX"],
      snippet: "Encoded",
      internalDate: "1778760000000",
      payload: {
        headers: [
          { name: "Subject", value: "Hi" },
          { name: "From", value: "=?UTF-8?B?Tmlrb2xhIFRlc2xh?= <nikola@example.com>" },
          { name: "To", value: "bojan@example.com" }
        ],
        body: { data: Buffer.from("Body").toString("base64url") }
      }
    });

    expect(message.from.email).toBe("nikola@example.com");
    expect(message.from.name).toBeUndefined();
  });
});
