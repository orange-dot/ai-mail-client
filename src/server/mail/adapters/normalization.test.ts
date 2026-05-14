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
});
