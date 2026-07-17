import { describe, expect, it } from "vitest";
import { resolveGenerationMode } from "./router";

describe("agent router", () => {
  it("força premium quando preference=premium", () => {
    expect(
      resolveGenerationMode("oi", {
        preference: "premium",
        hasExistingApp: true,
      }),
    ).toBe("premium");
  });

  it("usa repair quando forceRepair", () => {
    expect(
      resolveGenerationMode("x", {
        preference: "auto",
        hasExistingApp: true,
        forceRepair: true,
      }),
    ).toBe("repair");
  });

  it("criação full app → premium", () => {
    expect(
      resolveGenerationMode("monte um dashboard saas com auth", {
        preference: "auto",
        hasExistingApp: false,
      }),
    ).toBe("premium");
  });
});
