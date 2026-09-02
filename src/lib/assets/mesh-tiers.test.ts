import { describe, expect, it } from "vitest";
import { creditCostForMeshJob, MESH_CREDIT_COST } from "@/lib/assets/mesh-tiers";

describe("mesh credit SKUs", () => {
  it("logo e GPU cobram a tabela anti-prejuízo", () => {
    expect(creditCostForMeshJob({ capability: "mesh.logo" })).toBe(
      MESH_CREDIT_COST.logo,
    );
    expect(
      creditCostForMeshJob({ capability: "mesh.generate", requiresGpu: true }),
    ).toBe(MESH_CREDIT_COST.gpu);
    expect(creditCostForMeshJob({ capability: "mesh.generate" })).toBe(0);
  });

  it("tiers comerciais não dependem de GPU", () => {
    expect(
      creditCostForMeshJob({
        capability: "mesh.generate",
        meshTier: "game",
      }),
    ).toBe(MESH_CREDIT_COST.game);
    expect(
      creditCostForMeshJob({
        capability: "mesh.generate",
        meshTier: "flagship",
        requiresGpu: true,
      }),
    ).toBe(MESH_CREDIT_COST.flagship);
    expect(
      creditCostForMeshJob({ capability: "texture.generate" }),
    ).toBe(MESH_CREDIT_COST.retexture);
  });
});
