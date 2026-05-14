import { describe, expect, it } from "vitest";
import { buildMimeMessage, encodeBase64Url } from "./mime";

describe("mime", () => {
  it("builds a text message with expected headers", () => {
    const mime = buildMimeMessage({
      accountId: "acct",
      to: [{ name: "Taj", email: "taj@example.com" }],
      subject: "Update",
      bodyText: "Done."
    });

    expect(mime).toContain("To: \"Taj\" <taj@example.com>");
    expect(mime).toContain("Subject: Update");
    expect(mime).toContain("Done.");
  });

  it("encodes base64url payloads", () => {
    expect(encodeBase64Url("hello world")).toBe("aGVsbG8gd29ybGQ");
  });
});
