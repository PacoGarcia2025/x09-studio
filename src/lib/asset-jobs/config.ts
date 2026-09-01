/**
 * Infra da fila — genérico, sem capability e sem provider.
 * Jobs longos (imagem, vídeo, áudio, mesh, …) usam o mesmo stale/tick.
 */

/** Default: 40 min. Maior que o tick HTTP para só reenfileirar depois de um hang. */
export const DEFAULT_ASSET_JOB_STALE_MS = 40 * 60 * 1000;

const MIN_ASSET_JOB_STALE_MS = 60 * 1000;

/** Segundos do tick HTTP. Nos routes/pages o Next exige literal: `export const maxDuration = 1800`. */
export const ASSET_JOB_TICK_MAX_DURATION_SEC = 1800;

export function getAssetJobStaleMs(
  env: NodeJS.ProcessEnv = process.env,
): number {
  const raw = env.STUDIO_ASSET_JOB_STALE_MS?.trim();
  if (!raw) return DEFAULT_ASSET_JOB_STALE_MS;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < MIN_ASSET_JOB_STALE_MS) {
    return DEFAULT_ASSET_JOB_STALE_MS;
  }
  return Math.floor(parsed);
}
