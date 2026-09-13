import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { AuthError, requireUserFromRequest } from "@/lib/agent/auth";
import { classifyUpload, isAllowedByteSize } from "@/lib/assets/classify";
import { writeAssetFile } from "@/lib/assets/storage.server";
import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/supabase/env";
import { corsHeaders, corsPreflight } from "@/lib/http/cors";
import { jsonError } from "@/lib/http/errors";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: Request) {
  return corsPreflight(request, ["POST", "OPTIONS"]);
}

/** Upload de anexos do chat (imagens/vídeos de referência para geração). */
export async function POST(request: Request) {
  try {
    const user = await requireUserFromRequest(request);
    const token = (request.headers.get("authorization") ?? "").slice(7).trim();
    const supabase = createClient(getSupabaseUrl(), getSupabasePublishableKey(), {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: workspace } = await supabase
      .from("workspaces")
      .select("id")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!workspace?.id) {
      return NextResponse.json(
        { error: "Workspace não encontrado." },
        { status: 404, headers: corsHeaders(request, ["POST", "OPTIONS"]) },
      );
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Arquivo ausente." },
        { status: 400, headers: corsHeaders(request, ["POST", "OPTIONS"]) },
      );
    }
    if (!isAllowedByteSize(file.size)) {
      return NextResponse.json(
        { error: "Arquivo maior que o limite permitido (24MB)." },
        { status: 413, headers: corsHeaders(request, ["POST", "OPTIONS"]) },
      );
    }

    const classified = classifyUpload(file.name);
    if ("error" in classified) {
      return NextResponse.json(
        { error: classified.error },
        { status: 400, headers: corsHeaders(request, ["POST", "OPTIONS"]) },
      );
    }
    if (classified.kind !== "image" && classified.kind !== "video") {
      return NextResponse.json(
        { error: "Anexos do chat aceitam apenas imagem ou vídeo." },
        { status: 400, headers: corsHeaders(request, ["POST", "OPTIONS"]) },
      );
    }

    const assetId = randomUUID();
    const bytes = new Uint8Array(await file.arrayBuffer());
    const storagePath = await writeAssetFile({
      workspaceId: workspace.id,
      kind: classified.kind,
      assetId,
      extension: classified.extension,
      bytes,
    });

    const { error: insertError } = await supabase.from("assets").insert({
      id: assetId,
      workspace_id: workspace.id,
      created_by: user.id,
      kind: classified.kind,
      source: "chat-upload",
      status: "ready",
      original_name: classified.originalName,
      storage_path: storagePath,
      mime_type: file.type || null,
      byte_size: file.size,
    });

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500, headers: corsHeaders(request, ["POST", "OPTIONS"]) },
      );
    }

    return NextResponse.json(
      {
        id: assetId,
        kind: classified.kind,
        name: classified.originalName,
        url: `/api/assets/${assetId}/file`,
      },
      { headers: corsHeaders(request, ["POST", "OPTIONS"]) },
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return jsonError(error, "Não autenticado.", corsHeaders(request));
    }
    return jsonError(error, "Falha no upload.", corsHeaders(request));
  }
}
