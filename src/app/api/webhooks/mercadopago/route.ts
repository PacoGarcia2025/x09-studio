import { handleMercadoPagoWebhook } from "@/lib/billing/mercadopago-webhook.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Mercado Pago notification URL: /api/webhooks/mercadopago */
export async function POST(request: Request) {
  return handleMercadoPagoWebhook(request);
}
