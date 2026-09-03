/**
 * Tiers de malha que o Studio conhece — não são nomes de motor.
 * gpu = sidecar/GPU local; game/flagship = API paga (provider comercial).
 */
export const MESH_TIERS = ["gpu", "game", "flagship"] as const;
export type MeshTier = (typeof MESH_TIERS)[number];

/** Créditos X09 por job — calibrados no piso Studio (~R$ 0,95/crédito). */
export const MESH_CREDIT_COST = {
  logo: 1,
  gpu: 6,
  game: 18,
  flagship: 34,
  /** Auto-rig + passo básico (API comercial). */
  rig: 6,
  /** Retextura 2K (10 créditos upstream). */
  retexture: 12,
} as const;

export const MESH_CREDIT_COST_GAME_CHARACTER =
  MESH_CREDIT_COST.game + MESH_CREDIT_COST.rig;

export const MESH_ACTION_PRICES = [
  { id: "logo", label: "Placa ou logo 3D", credits: MESH_CREDIT_COST.logo },
  { id: "gpu", label: "Malha 3D na GPU", credits: MESH_CREDIT_COST.gpu },
  { id: "game", label: "Objeto 3D comercial", credits: MESH_CREDIT_COST.game },
  {
    id: "flagship",
    label: "Objeto 3D de alta qualidade",
    credits: MESH_CREDIT_COST.flagship,
  },
  {
    id: "gameCharacter",
    label: "Personagem para jogo",
    credits: MESH_CREDIT_COST_GAME_CHARACTER,
  },
  {
    id: "rig",
    label: "Preparar malha para jogo",
    credits: MESH_CREDIT_COST.rig,
  },
  { id: "retexture", label: "Retextura 2K", credits: MESH_CREDIT_COST.retexture },
] as const;

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
  rigForGame?: boolean;
  sourceMode?: unknown;
}): number {
  if (input.capability === "mesh.logo") return MESH_CREDIT_COST.logo;
  if (input.capability === "texture.generate") return MESH_CREDIT_COST.retexture;
  if (input.rigForGame && input.sourceMode === "rig") return MESH_CREDIT_COST.rig;
  if (input.rigForGame) {
    const tier = parseMeshTier(input.meshTier);
    const base =
      tier === "flagship" ? MESH_CREDIT_COST.flagship : MESH_CREDIT_COST.game;
    return base + MESH_CREDIT_COST.rig;
  }
  const tier = parseMeshTier(input.meshTier);
  if (tier === "game") return MESH_CREDIT_COST.game;
  if (tier === "flagship") return MESH_CREDIT_COST.flagship;
  if (input.requiresGpu) return MESH_CREDIT_COST.gpu;
  return 0;
}
