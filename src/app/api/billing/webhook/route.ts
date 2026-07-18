import { handleMercadoPagoWebhook } from "@/lib/billing/mercadopago-webhook.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleMercadoPagoWebhook(request);
}
