import { z } from "zod";
import { AuthError, assertRateLimit, requireUserFromRequest } from "@/lib/agent/auth";
import { pushProjectToGitHub } from "@/lib/github/push.server";
import { corsHeaders, corsPreflight } from "@/lib/http/cors";
import { jsonError } from "@/lib/http/errors";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const BodySchema = z.object({
  message: z.string().max(200).optional(),
});

export async function OPTIONS(request: Request) {
  return corsPreflight(request, ["POST", "OPTIONS"]);
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUserFromRequest(request);
    assertRateLimit(user.id, 10);
    const { id } = await ctx.params;
    const parsed = BodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return Response.json(
        { error: "Payload inválido" },
        { status: 400, headers: corsHeaders(request) },
      );
    }

    const result = await pushProjectToGitHub({
      userId: user.id,
      projectId: id,
      message: parsed.data.message,
    });

    return Response.json(result, { headers: corsHeaders(request) });
  } catch (error) {
    if (error instanceof AuthError) {
      return jsonError(error, "Não autenticado.", corsHeaders(request));
    }
    return jsonError(error, "Falha ao sincronizar com GitHub.", corsHeaders(request));
  }
}
