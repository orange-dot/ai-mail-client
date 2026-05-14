import { describe, expect, it } from "vitest";
import { scorePriority } from "./priority";

describe("scorePriority", () => {
  it("marks direct urgent requests as urgent", () => {
    const result = scorePriority({
      subject: "Security deadline today",
      snippet: "Please confirm ASAP",
      bodyText: "Please review before 15:00.",
      flags: { unread: true },
      labels: ["priority"],
      receivedAt: new Date().toISOString()
    });

    expect(result.priority).toBe("urgent");
    expect(result.rationale).toContain("direct action request");
  });

  it("keeps passive old messages low priority", () => {
    const result = scorePriority({
      subject: "Newsletter",
      snippet: "Monthly digest",
      bodyText: "A digest of links.",
      flags: { unread: false },
      labels: [],
      receivedAt: "2025-01-01T00:00:00.000Z"
    });

    expect(result.priority).toBe("low");
  });
});
