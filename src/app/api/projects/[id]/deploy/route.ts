import { AuthError, assertRateLimit, requireUserFromRequest } from "@/lib/agent/auth";
import { startVercelDeploy } from "@/lib/deploy/vercel.server";
import { corsHeaders, corsPreflight } from "@/lib/http/cors";
import { jsonError } from "@/lib/http/errors";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireOwnedVisualProject } from "@/lib/ownership/visual-project";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function OPTIONS(request: Request) {
  return corsPreflight(request, ["GET", "POST", "OPTIONS"]);
}

export async function GET(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUserFromRequest(request);
    const { id } = await ctx.params;
    const project = await requireOwnedVisualProject(id, user.id);
    const admin = createAdminClient();
    const { data: deployments } = await admin
      .from("project_deployments")
      .select("*")
      .eq("project_id", id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    return Response.json(
      {
        publishedUrl: project.published_url,
        publishStatus: project.publish_status,
        lastDeployId: project.last_deploy_id,
        deployments: deployments ?? [],
      },
      { headers: corsHeaders(request) },
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return jsonError(error, "Não autenticado.", corsHeaders(request));
    }
    return jsonError(error, "Falha ao listar deploys.", corsHeaders(request));
  }
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUserFromRequest(request);
    assertRateLimit(user.id, 5);
    const { id } = await ctx.params;
    const deployment = await startVercelDeploy({
      userId: user.id,
      projectId: id,
    });
    return Response.json(
      { deployment },
      { headers: corsHeaders(request) },
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return jsonError(error, "Não autenticado.", corsHeaders(request));
    }
    return jsonError(error, "Falha ao iniciar deploy.", corsHeaders(request));
  }
}
