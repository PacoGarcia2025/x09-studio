import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isValidSlug, slugify } from "@/lib/projects/types";
import { buildProjectSubdomainUrl } from "@/lib/projects/publish-url";

const BodySchema = z.object({
  slug: z.string().min(2).max(48),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: projectId } = await context.params;
    const body = await request.json();
    const parsed = BodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Slug inválido. Use de 2 a 48 caracteres alfanuméricos e hífens." },
        { status: 400 },
      );
    }

    const newSlug = slugify(parsed.data.slug);
    if (!isValidSlug(newSlug)) {
      return NextResponse.json(
        { ok: false, error: "Slug inválido. Formato aceito: minúsculas, números e hífens." },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const { data: existing } = await supabase
      .from("projects")
      .select("id")
      .eq("slug", newSlug)
      .neq("id", projectId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { ok: false, error: "Este subdomínio já está em uso por outro projeto. Escolha outro nome." },
        { status: 409 },
      );
    }

    const newUrl = buildProjectSubdomainUrl(newSlug);
    const { error: updateError } = await supabase
      .from("projects")
      .update({
        slug: newSlug,
        published_url: newUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", projectId);

    if (updateError) {
      return NextResponse.json(
        { ok: false, error: "Erro ao atualizar subdomínio no banco de dados." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      slug: newSlug,
      publishedUrl: newUrl,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Falha interna ao processar alteração de subdomínio." },
      { status: 500 },
    );
  }
}
