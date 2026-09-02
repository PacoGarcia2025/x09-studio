/**
 * Contas internas (você). Não é o owner do workspace do cliente.
 * Lista: STUDIO_OWNER_EMAIL e STUDIO_OPERATOR_EMAILS (vírgulas).
 * Sem lista e fora de production: o e-mail autenticado vale — setup local.
 */
export function studioOperatorAllowlist(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): string[] {
  return [env.STUDIO_OWNER_EMAIL, env.STUDIO_OPERATOR_EMAILS]
    .filter(Boolean)
    .flatMap((value) => String(value).split(/[,;]+/))
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export function isStudioOperatorEmail(
  email: string | null | undefined,
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): boolean {
  const needle = email?.trim().toLowerCase();
  if (!needle) return false;
  const listed = studioOperatorAllowlist(env);
  if (listed.length > 0) return listed.includes(needle);
  return (env.NODE_ENV ?? "").toLowerCase() !== "production";
}
