import { z } from "zod";
import { AuthError, assertRateLimit, requireUserFromRequest } from "@/lib/agent/auth";
import { createOrLinkRepository } from "@/lib/github/push.server";
import { corsHeaders, corsPreflight } from "@/lib/http/cors";
import { jsonError } from "@/lib/http/errors";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireOwnedVisualProject } from "@/lib/ownership/visual-project";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  repoName: z.string().min(1).max(100).optional(),
  private: z.boolean().optional(),
});

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
    await requireOwnedVisualProject(id, user.id);

    const admin = createAdminClient();
    const { data } = await admin
      .from("github_repositories")
      .select("*")
      .eq("project_id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    return Response.json(
      { repository: data },
      { headers: corsHeaders(request) },
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return jsonError(error, "Não autenticado.", corsHeaders(request));
    }
    return jsonError(error, "Falha ao ler repositório.", corsHeaders(request));
  }
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

    const repository = await createOrLinkRepository({
      userId: user.id,
      projectId: id,
      repoName: parsed.data.repoName,
      private: parsed.data.private,
    });

    return Response.json(
      { repository },
      { headers: corsHeaders(request) },
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return jsonError(error, "Não autenticado.", corsHeaders(request));
    }
    return jsonError(error, "Falha ao criar repositório.", corsHeaders(request));
  }
}
