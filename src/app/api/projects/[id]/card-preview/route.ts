import { createClient } from "@/lib/supabase/server";
import { buildProjectCardPreviewHtml } from "@/lib/projects/hero-preview.server";
import { projectDirExists } from "@/lib/projects/fs.server";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Não autenticado", { status: 401 });
  }

  const { data: project, error } = await supabase
    .from("projects")
    .select("id, name, workspace_id")
    .eq("id", id)
    .maybeSingle();

  if (error || !project) {
    return new Response("Projeto não encontrado", { status: 404 });
  }

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("owner_id")
    .eq("id", project.workspace_id)
    .maybeSingle();

  if (!workspace || workspace.owner_id !== user.id) {
    return new Response("Sem permissão", { status: 403 });
  }

  const exists = await projectDirExists(id);
  const html = exists
    ? await buildProjectCardPreviewHtml(id, project.name)
    : `<!doctype html><html><body style="margin:0;font-family:sans-serif">
        <section style="min-height:420px;display:grid;place-items:center;background:linear-gradient(135deg,#8B5CF6,#D946EF,#6366F1);color:#fff">
          <div style="text-align:center;padding:2rem">
            <h1 style="font-size:2rem;margin:0">${escapeHtml(project.name)}</h1>
            <p style="opacity:.85">Arquivos do projeto ainda não gerados</p>
          </div>
        </section>
      </body></html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, max-age=60",
    },
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
