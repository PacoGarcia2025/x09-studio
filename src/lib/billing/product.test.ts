import { describe, expect, it } from "vitest";
import {
  BUILD_CREDIT_COST,
  SIGNUP_BONUS_CREDITS,
  TEXT_TO_3D_CREDIT_COST,
  studioSupportEmail,
} from "@/lib/billing/product";

describe("billing product constants", () => {
  it("signup bonus covers one commercial 3D plus one site", () => {
    expect(SIGNUP_BONUS_CREDITS).toBe(20);
    expect(TEXT_TO_3D_CREDIT_COST).toBe(18);
    expect(BUILD_CREDIT_COST).toBe(1);
    expect(SIGNUP_BONUS_CREDITS).toBeGreaterThanOrEqual(
      TEXT_TO_3D_CREDIT_COST + BUILD_CREDIT_COST,
    );
  });

  it("uses the support email override when set", () => {
    expect(studioSupportEmail({ STUDIO_SUPPORT_EMAIL: "ops@x09.com.br" })).toBe(
      "ops@x09.com.br",
    );
    expect(studioSupportEmail({})).toBe("studio@x09.com.br");
  });
});
