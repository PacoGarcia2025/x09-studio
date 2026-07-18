import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyGitHubWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret = process.env.GITHUB_WEBHOOK_SECRET?.trim(),
  skipVerify = process.env.GITHUB_WEBHOOK_SKIP_VERIFY === "1",
): boolean {
  if (!secret) return skipVerify;
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const expected =
    "sha256=" +
    createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(signatureHeader);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
