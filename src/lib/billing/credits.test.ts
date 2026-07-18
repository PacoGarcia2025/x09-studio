import { describe, expect, it } from "vitest";
import {
  CREDIT_COSTS,
  creditCostFor,
  resolveBillableMode,
} from "@/lib/billing/credits";

describe("credit billing modes", () => {
  it("charges one credit for code-producing builds", () => {
    expect(resolveBillableMode({ mode: "premium" })).toBe("generation");
    expect(resolveBillableMode({ mode: "fast" })).toBe("generation");
    expect(creditCostFor("generation")).toBe(CREDIT_COSTS.generation);
    expect(CREDIT_COSTS.generation).toBe(1);
  });

  it("charges one credit for edits that generate code", () => {
    expect(resolveBillableMode({ mode: "edit" })).toBe("edit");
    expect(creditCostFor("edit")).toBe(1);
  });

  it("skips billing for plan-only and repair phases", () => {
    expect(resolveBillableMode({ mode: "plan", phase: "plan" })).toBe("skip");
    expect(resolveBillableMode({ mode: "repair" })).toBe("skip");
    expect(
      resolveBillableMode({ mode: "premium", phase: "repair" }),
    ).toBe("skip");
    expect(creditCostFor("skip")).toBe(0);
  });

  it("treats the automatic agent pipeline as one Build", () => {
    // Internal plan + build + repair share one top-level debit.
    expect(resolveBillableMode({ mode: "premium", phase: "auto" })).toBe(
      "generation",
    );
    expect(creditCostFor("generation")).toBe(1);
  });
});
