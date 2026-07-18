import { describe, expect, it } from "vitest";
import {
  isApprovedPayment,
  resolveCreditPurchaseIdentity,
} from "@/lib/billing/mercadopago-payment";

const USER_ID = "2fc4c73e-6a91-4f1e-8d5d-2cd7e1748fd8";

describe("Mercado Pago credit payment reconciliation", () => {
  it("reads user and package from server-created metadata", () => {
    expect(
      resolveCreditPurchaseIdentity({
        metadata: { user_id: USER_ID, package_code: "basic" },
      }),
    ).toEqual({ userId: USER_ID, packageCode: "basic" });
  });

  it("falls back to the external reference", () => {
    expect(
      resolveCreditPurchaseIdentity({
        external_reference: `credits:${USER_ID}:pro`,
      }),
    ).toEqual({ userId: USER_ID, packageCode: "pro" });
  });

  it("rejects malformed identities", () => {
    expect(
      resolveCreditPurchaseIdentity({
        external_reference: "credits:not-a-user:pro",
      }),
    ).toBeNull();
  });

  it("grants only approved payments", () => {
    expect(isApprovedPayment({ status: "approved" })).toBe(true);
    expect(isApprovedPayment({ status: "pending" })).toBe(false);
    expect(isApprovedPayment({ status: "rejected" })).toBe(false);
  });
});
