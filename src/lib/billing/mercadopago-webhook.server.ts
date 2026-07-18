import "server-only";
import {
  processMercadoPagoWebhook,
  verifyMercadoPagoSignature,
} from "@/lib/billing/mercadopago.server";

type MercadoPagoWebhookPayload = {
  id?: string | number;
  type?: string;
  action?: string;
  data?: { id?: string | number };
};

export async function handleMercadoPagoWebhook(
  request: Request,
): Promise<Response> {
  const raw = await request.text();
  let payload: MercadoPagoWebhookPayload;

  try {
    payload = JSON.parse(raw) as MercadoPagoWebhookPayload;
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const dataId = String(payload.data?.id ?? "");
  const action = String(payload.action ?? "");
  const type = String(payload.type ?? "");
  const topic =
    type === "payment" || action.startsWith("payment.")
      ? "payment"
      : type || action || "unknown";
  const eventId = String(
    payload.id ??
      `${action || topic}:${dataId}:${request.headers.get("x-request-id") ?? "no-request-id"}`,
  );

  if (
    !verifyMercadoPagoSignature({
      xSignature: request.headers.get("x-signature"),
      xRequestId: request.headers.get("x-request-id"),
      dataId,
    })
  ) {
    return Response.json({ error: "invalid_signature" }, { status: 401 });
  }

  if (!dataId) {
    return Response.json({ ok: true, ignored: true });
  }

  // payment.updated and payment.created are both reconciled against the
  // authoritative Payment API. Credits are granted only when status=approved.
  const result = await processMercadoPagoWebhook({
    eventId,
    topic,
    dataId,
    payload,
  });

  return Response.json(result);
}
