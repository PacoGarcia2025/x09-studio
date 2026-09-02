import { MESH_CREDIT_COST } from "@/lib/assets/mesh-tiers";
import { CREDIT_COSTS } from "@/lib/billing/credits";

/** Conta nova: cobre um Texto → 3D comercial e um site. */
export const SIGNUP_BONUS_CREDITS = 20;

export const BUILD_CREDIT_COST = CREDIT_COSTS.generation;
export const TEXT_TO_3D_CREDIT_COST = MESH_CREDIT_COST.game;

export const STUDIO_SUPPORT_EMAIL_FALLBACK = "studio@x09.com.br";

export function studioSupportEmail(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): string {
  return env.STUDIO_SUPPORT_EMAIL?.trim() || STUDIO_SUPPORT_EMAIL_FALLBACK;
}
