import { describe, expect, it } from "vitest";
import { demoMessages } from "./demo-data";
import { filterMessages } from "./mail-filters";

describe("filterMessages", () => {
  it("hides archived and deleted messages by default", () => {
    expect(filterMessages(demoMessages, {}).map((message) => message.id)).not.toContain("msg-5");
  });

  it("filters by account and label", () => {
    const results = filterMessages(demoMessages, { accountId: "acct-o365", label: "work" });
    expect(results.map((message) => message.id)).toEqual(["msg-2"]);
  });

  it("searches normalized message fields", () => {
    const results = filterMessages(demoMessages, { query: "AES-GCM" });
    expect(results).toHaveLength(1);
    expect(results[0]?.subject).toBe("Vendor security questionnaire");
  });
});
