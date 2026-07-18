import { AuthError, assertRateLimit, requireUserFromRequest } from "@/lib/agent/auth";
import { cancelMercadoPagoSubscription } from "@/lib/billing/mercadopago.server";
import { corsHeaders, corsPreflight } from "@/lib/http/cors";
import { jsonError } from "@/lib/http/errors";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: Request) {
  return corsPreflight(request, ["POST", "OPTIONS"]);
}

export async function POST(request: Request) {
  try {
    const user = await requireUserFromRequest(request);
    assertRateLimit(user.id, 5);
    const result = await cancelMercadoPagoSubscription(user.id);
    return Response.json(result, {
      headers: corsHeaders(request, ["POST", "OPTIONS"]),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return jsonError(error, "Não autenticado.", corsHeaders(request));
    }
    return jsonError(error, "Falha ao cancelar assinatura.", corsHeaders(request));
  }
}
