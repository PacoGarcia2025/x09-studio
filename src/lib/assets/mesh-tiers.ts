/**
 * Tiers de malha que o Studio conhece — não são nomes de motor.
 * gpu = sidecar/GPU local; game/flagship = API paga (provider comercial).
 */
export const MESH_TIERS = ["gpu", "game", "flagship"] as const;
export type MeshTier = (typeof MESH_TIERS)[number];

/** Créditos X09 por job (pacote Básico R$ 0,49) — margem anti-prejuízo. */
export const MESH_CREDIT_COST = {
  logo: 1,
  gpu: 6,
  game: 18,
  flagship: 34,
  /** Retextura 2K (10 créditos upstream). */
  retexture: 12,
} as const;

export function isMeshTier(value: unknown): value is MeshTier {
  return value === "gpu" || value === "game" || value === "flagship";
}

export function parseMeshTier(value: unknown): MeshTier | null {
  return isMeshTier(value) ? value : null;
}

export function isCommercialMeshTier(value: unknown): boolean {
  return value === "game" || value === "flagship";
}

export function creditCostForMeshJob(input: {
  capability: string;
  meshTier?: unknown;
  requiresGpu?: boolean;
}): number {
  if (input.capability === "mesh.logo") return MESH_CREDIT_COST.logo;
  if (input.capability === "texture.generate") return MESH_CREDIT_COST.retexture;
  const tier = parseMeshTier(input.meshTier);
  if (tier === "game") return MESH_CREDIT_COST.game;
  if (tier === "flagship") return MESH_CREDIT_COST.flagship;
  if (input.requiresGpu) return MESH_CREDIT_COST.gpu;
  return 0;
}
