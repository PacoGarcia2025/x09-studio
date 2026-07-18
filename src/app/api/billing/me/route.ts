import { AuthError, requireUserFromRequest } from "@/lib/agent/auth";
import { getBillingSnapshot } from "@/lib/billing/credits.server";
import { corsHeaders, corsPreflight } from "@/lib/http/cors";
import { jsonError } from "@/lib/http/errors";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: Request) {
  return corsPreflight(request, ["GET", "OPTIONS"]);
}

export async function GET(request: Request) {
  try {
    const user = await requireUserFromRequest(request);
    const snapshot = await getBillingSnapshot(user.id);
    return Response.json(snapshot, {
      headers: corsHeaders(request, ["GET", "OPTIONS"]),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return jsonError(error, "Não autenticado.", corsHeaders(request));
    }
    return jsonError(error, "Falha ao carregar billing.", corsHeaders(request));
  }
}
