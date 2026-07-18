import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";

/**
 * Mirrors verifyMercadoPagoSignature logic without importing server-only module.
 */
function verifyMpSignature(input: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
  secret: string;
}): boolean {
  if (!input.xSignature || !input.dataId) return false;
  const parts = Object.fromEntries(
    input.xSignature.split(",").map((part) => {
      const [k, v] = part.split("=");
      return [k?.trim() ?? "", v?.trim() ?? ""];
    }),
  );
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;
  const manifest = `id:${input.dataId};request-id:${input.xRequestId ?? ""};ts:${ts};`;
  const expected = createHmac("sha256", input.secret)
    .update(manifest)
    .digest("hex");
  return expected === v1;
}

describe("Mercado Pago webhook signature manifest", () => {
  afterEach(() => {
    // no env mutation
  });

  it("validates v1 signature", () => {
    const secret = "mp-secret";
    const dataId = "12345";
    const requestId = "req-1";
    const ts = "1700000000";
    const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
    const v1 = createHmac("sha256", secret).update(manifest).digest("hex");
    expect(
      verifyMpSignature({
        xSignature: `ts=${ts},v1=${v1}`,
        xRequestId: requestId,
        dataId,
        secret,
      }),
    ).toBe(true);
  });

  it("rejects bad signature", () => {
    expect(
      verifyMpSignature({
        xSignature: "ts=1,v1=bad",
        xRequestId: "r",
        dataId: "1",
        secret: "mp-secret",
      }),
    ).toBe(false);
  });
});
