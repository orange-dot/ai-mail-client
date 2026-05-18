import { describe, expect, it } from "vitest";
import { decodeCredentials, encodeCredentials, mergeCredentials } from "./session-credentials";

describe("session credentials", () => {
  it("round trips an encrypted credentials object", () => {
    const encoded = encodeCredentials({
      googleClientId: "demo-id.apps.googleusercontent.com",
      googleClientSecret: "GOCSPX-demo-secret",
      anthropicApiKey: "sk-ant-demo-key"
    });

    expect(encoded).not.toContain("GOCSPX-demo-secret");
    expect(encoded).not.toContain("sk-ant-demo-key");
    expect(decodeCredentials(encoded)).toEqual({
      googleClientId: "demo-id.apps.googleusercontent.com",
      googleClientSecret: "GOCSPX-demo-secret",
      anthropicApiKey: "sk-ant-demo-key"
    });
  });

  it("returns an empty object for a missing, garbage, or tampered cookie", () => {
    expect(decodeCredentials(undefined)).toEqual({});
    expect(decodeCredentials(null)).toEqual({});
    expect(decodeCredentials("")).toEqual({});
    expect(decodeCredentials("not-a-real-payload")).toEqual({});

    const encoded = encodeCredentials({ anthropicApiKey: "sk-ant-demo-key" });
    expect(decodeCredentials(`${encoded}tampered`)).toEqual({});
  });

  it("drops blank fields when encoding", () => {
    const decoded = decodeCredentials(encodeCredentials({ googleClientId: "   ", anthropicApiKey: "sk-ant-demo-key" }));
    expect(decoded).toEqual({ anthropicApiKey: "sk-ant-demo-key" });
  });

  it("merges a partial update over existing credentials", () => {
    const current = { googleClientId: "id", googleClientSecret: "secret", anthropicApiKey: "key" };

    // An absent field is left unchanged.
    expect(mergeCredentials(current, { anthropicApiKey: "new-key" })).toEqual({
      googleClientId: "id",
      googleClientSecret: "secret",
      anthropicApiKey: "new-key"
    });

    // An explicit empty string clears a field.
    expect(mergeCredentials(current, { anthropicApiKey: "" })).toEqual({
      googleClientId: "id",
      googleClientSecret: "secret"
    });
  });
});
