import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyGitHubWebhookSignature } from "@/lib/github/webhook-signature";

describe("GitHub webhook signature", () => {
  it("accepts valid sha256 HMAC", () => {
    const body = '{"action":"created"}';
    const digest = createHmac("sha256", "test-secret")
      .update(body, "utf8")
      .digest("hex");
    expect(
      verifyGitHubWebhookSignature(body, `sha256=${digest}`, "test-secret"),
    ).toBe(true);
  });

  it("rejects invalid signature", () => {
    expect(
      verifyGitHubWebhookSignature("{}", "sha256=deadbeef", "test-secret"),
    ).toBe(false);
  });

  it("allows skip verify when secret missing", () => {
    expect(verifyGitHubWebhookSignature("{}", null, undefined, true)).toBe(
      true,
    );
    expect(verifyGitHubWebhookSignature("{}", null, undefined, false)).toBe(
      false,
    );
  });
});
