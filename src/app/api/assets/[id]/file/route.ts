import { NextResponse } from "next/server";
import { assertWorkspaceOwner } from "@/lib/ai-engine/ownership";
import { isMissingRelationError } from "@/lib/assets/schema";
import { readAssetFile } from "@/lib/assets/storage.server";

export const dynamic = "force-dynamic";

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  mp4: "video/mp4",
  webm: "video/webm",
  glb: "model/gltf-binary",
  gltf: "model/gltf+json",
  hdr: "application/octet-stream",
  exr: "application/octet-stream",
  obj: "text/plain",
  ktx2: "application/octet-stream",
};

function extOf(value: string): string {
  const name = value.split(/[\\/]/).pop() ?? "";
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
}

function mimeFor(asset: {
  mime_type: string | null;
  storage_path: string;
  original_name: string;
}): string {
  const stored = asset.mime_type?.trim() || "";
  if (stored && stored !== "application/octet-stream") return stored;
  const ext = extOf(asset.original_name) || extOf(asset.storage_path);
  return MIME_BY_EXT[ext] || "application/octet-stream";
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const gate = await assertWorkspaceOwner();
  if (gate.error || !gate.workspaceId) {
    return NextResponse.json(
      { error: gate.error ?? "Não autenticado" },
      { status: 401 },
    );
  }

  const { data: asset, error } = await gate.supabase
    .from("assets")
    .select(
      "id, workspace_id, storage_path, mime_type, original_name, status",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    const status = isMissingRelationError(error) ? 503 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
  if (!asset || asset.workspace_id !== gate.workspaceId) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }
  if (asset.status === "archived") {
    return NextResponse.json({ error: "Arquivado" }, { status: 410 });
  }

  try {
    const bytes = await readAssetFile(asset.storage_path);
    const type = mimeFor(asset);
    const filename = asset.original_name.replace(/[^\w.\-]+/g, "_") || "arquivo";
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": type,
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "private, max-age=120",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Arquivo ausente no disco" },
      { status: 404 },
    );
  }
}
