/** Aceita o nome do Studio e o do site x09. */

export function readMercadoPagoAccessToken(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): string | null {
  const token = (
    env.MP_ACCESS_TOKEN ||
    env.MERCADO_PAGO_ACCESS_TOKEN ||
    ""
  ).trim();
  return token || null;
}

export function readMercadoPagoWebhookSecret(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): string | null {
  const secret = (
    env.MP_WEBHOOK_SECRET ||
    env.MERCADO_PAGO_WEBHOOK_SECRET ||
    ""
  ).trim();
  return secret || null;
}
