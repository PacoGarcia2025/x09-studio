import { describe, expect, it } from "vitest";
import {
  BUILD_CREDIT_COST,
  CREDIT_PACKAGES,
  SIGNUP_BONUS_CREDITS,
  TEXT_TO_3D_CREDIT_COST,
  isCreditPackageCode,
  studioSupportEmail,
} from "@/lib/billing/product";

describe("billing product constants", () => {
  it("signup bonus covers one commercial 3D plus one site and one edit", () => {
    expect(SIGNUP_BONUS_CREDITS).toBe(23);
    expect(TEXT_TO_3D_CREDIT_COST).toBe(18);
    expect(BUILD_CREDIT_COST).toBe(3);
    expect(SIGNUP_BONUS_CREDITS).toBe(
      TEXT_TO_3D_CREDIT_COST + BUILD_CREDIT_COST + 2,
    );
  });

  it("keeps every paid pack above the site-heavy floor", () => {
    const minReaisPerCredit = 0.9;
    for (const pack of CREDIT_PACKAGES) {
      const reaisPerCredit = pack.amountCents / 100 / pack.credits;
      expect(reaisPerCredit).toBeGreaterThanOrEqual(minReaisPerCredit);
      expect(isCreditPackageCode(pack.code)).toBe(true);
    }
    expect(CREDIT_PACKAGES.map((pack) => pack.code)).toEqual([
      "basic",
      "plus",
      "pro",
      "studio",
    ]);
  });

  it("uses the support email override when set", () => {
    expect(studioSupportEmail({ STUDIO_SUPPORT_EMAIL: "ops@x09.com.br" })).toBe(
      "ops@x09.com.br",
    );
    expect(studioSupportEmail({})).toBe("studio@x09.com.br");
  });
});
