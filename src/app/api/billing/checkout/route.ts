import { z } from "zod";
import { AuthError, assertRateLimit, requireUserFromRequest } from "@/lib/agent/auth";
import { createCreditCheckout } from "@/lib/billing/mercadopago.server";
import { corsHeaders, corsPreflight } from "@/lib/http/cors";
import { jsonError } from "@/lib/http/errors";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  planCode: z.enum(["basic", "pro"]),
  backUrl: z.string().url().optional(),
});

export async function OPTIONS(request: Request) {
  return corsPreflight(request, ["POST", "OPTIONS"]);
}

export async function POST(request: Request) {
  try {
    const user = await requireUserFromRequest(request);
    assertRateLimit(user.id, 10);

    const parsed = BodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json(
        { error: "Payload inválido" },
        { status: 400, headers: corsHeaders(request) },
      );
    }

    const origin =
      request.headers.get("origin") ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://studio.x09.com.br";

    const result = await createCreditCheckout({
      userId: user.id,
      email: user.email,
      planCode: parsed.data.planCode,
      backUrl: parsed.data.backUrl || `${origin}/`,
    });

    return Response.json(result, {
      headers: corsHeaders(request, ["POST", "OPTIONS"]),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return jsonError(error, "Não autenticado.", corsHeaders(request));
    }
    return jsonError(error, "Falha no checkout.", corsHeaders(request));
  }
}
