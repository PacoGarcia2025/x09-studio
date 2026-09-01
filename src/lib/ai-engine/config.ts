/**
 * Flags de política. Não escolhe motor por nome.
 */
export function isAiGenerationEnabled(): boolean {
  return process.env.STUDIO_AI_ENGINE_GENERATION_ENABLED?.trim() === "true";
}

export function getAiEngineWorkerUrl(): string | null {
  const url =
    process.env.STUDIO_ASSET_WORKER_URL?.trim() ||
    process.env.STUDIO_AI_ENGINE_WORKER_URL?.trim();
  return url || null;
}

export function hasAiEngineWorkerSecret(): boolean {
  return Boolean(
    process.env.STUDIO_ASSET_WORKER_SECRET?.trim() ||
      process.env.STUDIO_AI_ENGINE_WORKER_SECRET?.trim(),
  );
}

/** @deprecated Use o Capability Router. Mantido para health antigo. */
export function getDefaultAiAssetProviderId(): string {
  return "local-assets";
}
