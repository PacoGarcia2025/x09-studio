export function meshyApiKeyFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  const raw = env.STUDIO_MESHY_API_KEY?.trim();
  return raw || null;
}

export function isCommercialMeshConfigured(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return Boolean(meshyApiKeyFromEnv(env));
}
