import { AuthError, requireUserFromRequest } from "@/lib/agent/auth";
import { syncDeploymentStatus } from "@/lib/deploy/vercel.server";
import { corsHeaders, corsPreflight } from "@/lib/http/cors";
import { jsonError } from "@/lib/http/errors";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: Request) {
  return corsPreflight(request, ["GET", "OPTIONS"]);
}

export async function GET(
  request: Request,
  ctx: { params: Promise<{ id: string; deploymentId: string }> },
) {
  try {
    const user = await requireUserFromRequest(request);
    const { id, deploymentId } = await ctx.params;
    const deployment = await syncDeploymentStatus({
      userId: user.id,
      projectId: id,
      deploymentId,
    });
    return Response.json(
      { deployment },
      { headers: corsHeaders(request) },
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return jsonError(error, "Não autenticado.", corsHeaders(request));
    }
    return jsonError(error, "Falha ao sincronizar status.", corsHeaders(request));
  }
}
