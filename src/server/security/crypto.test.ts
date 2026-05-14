import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret, isValidAccessToken } from "./crypto";

describe("secret crypto", () => {
  it("round trips encrypted values", () => {
    const encrypted = encryptSecret("refresh-token-value", "test-secret");
    expect(encrypted).not.toContain("refresh-token-value");
    expect(decryptSecret(encrypted, "test-secret")).toBe("refresh-token-value");
  });

  it("rejects mismatched access tokens", () => {
    expect(isValidAccessToken("abc", "abc")).toBe(true);
    expect(isValidAccessToken("abc", "abcd")).toBe(false);
    expect(isValidAccessToken(null, "abc")).toBe(false);
  });
});
