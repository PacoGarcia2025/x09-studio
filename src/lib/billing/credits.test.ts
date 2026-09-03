import { describe, expect, it } from "vitest";
import { MESH_ACTION_PRICES, MESH_CREDIT_COST } from "@/lib/assets/mesh-tiers";
import {
  CREDIT_COSTS,
  STUDIO_ACTION_PRICES,
  creditCostFor,
  ledgerReasonForMode,
  resolveBillableMode,
} from "@/lib/billing/credits";

describe("credit billing modes", () => {
  it("charges three credits for code-producing builds", () => {
    expect(resolveBillableMode({ mode: "premium" })).toBe("generation");
    expect(resolveBillableMode({ mode: "fast" })).toBe("generation");
    expect(creditCostFor("generation")).toBe(CREDIT_COSTS.generation);
    expect(CREDIT_COSTS.generation).toBe(3);
  });

  it("charges two credits for edits that generate code", () => {
    expect(resolveBillableMode({ mode: "edit" })).toBe("edit");
    expect(creditCostFor("edit")).toBe(2);
    expect(CREDIT_COSTS.edit).toBe(2);
  });

  it("charges one credit for ask-only chat", () => {
    expect(creditCostFor("ask")).toBe(1);
    expect(CREDIT_COSTS.ask).toBe(1);
    expect(ledgerReasonForMode("ask")).toBe("edit_debit");
    expect(ledgerReasonForMode("edit")).toBe("edit_debit");
    expect(ledgerReasonForMode("generation")).toBe("generation_debit");
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
    expect(creditCostFor("generation")).toBe(3);
  });

  it("publishes the user-facing action table", () => {
    expect(STUDIO_ACTION_PRICES.map((row) => [row.id, row.credits])).toEqual([
      ["ask", 1],
      ["edit", 2],
      ["generation", 3],
      ["repair", 0],
      ["visual", 0],
    ]);
    expect(MESH_ACTION_PRICES.map((row) => [row.id, row.credits])).toEqual([
      ["logo", MESH_CREDIT_COST.logo],
      ["gpu", MESH_CREDIT_COST.gpu],
      ["game", MESH_CREDIT_COST.game],
      ["flagship", MESH_CREDIT_COST.flagship],
      ["gameCharacter", MESH_CREDIT_COST.game + MESH_CREDIT_COST.rig],
      ["rig", MESH_CREDIT_COST.rig],
      ["retexture", MESH_CREDIT_COST.retexture],
    ]);
  });
});
