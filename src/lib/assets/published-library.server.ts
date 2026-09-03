import "server-only";

import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { readAssetFile } from "@/lib/assets/storage.server";
import {
  parseLibraryPublicFilename,
  pickLibraryAssets,
  sanitizeLibraryFilename,
  type LibraryAssetRow,
} from "@/lib/assets/project-library-catalog";
import {
  resolveInsideProject,
} from "@/lib/projects/fs.server";
import { getStaticClientsRoot } from "@/lib/projects/paths";
import { createAdminClient } from "@/lib/supabase/admin";

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  glb: "model/gltf-binary",
  gltf: "model/gltf+json",
  mp4: "video/mp4",
  webm: "video/webm",
};

export type ResolvedLibraryFile = {
  bytes: Buffer;
  contentType: string;
  filename: string;
};

function contentTypeOf(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXT[ext] ?? "application/octet-stream";
}

async function readIfFile(absolute: string): Promise<Buffer | null> {
  try {
    const st = await fs.stat(absolute);
    if (!st.isFile() || st.size <= 0) return null;
    return fs.readFile(absolute);
  } catch {
    return null;
  }
}

async function readProjectLibraryFile(
  projectId: string,
  filename: string,
): Promise<Buffer | null> {
  try {
    const absolute = resolveInsideProject(
      projectId,
      `public/library/${filename}`,
    );
    return readIfFile(absolute);
  } catch {
    return null;
  }
}

async function readStaticClientLibraryFile(
  slug: string,
  filename: string,
): Promise<Buffer | null> {
  const absolute = path.join(getStaticClientsRoot(), slug, "library", filename);
  return readIfFile(absolute);
}

async function readWorkspaceAssetFile(
  workspaceId: string,
  filename: string,
): Promise<Buffer | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("assets")
    .select("id, kind, original_name, storage_path, byte_size, meta, status")
    .eq("workspace_id", workspaceId)
    .neq("status", "archived")
    .order("created_at", { ascending: false })
    .limit(40);

  if (error || !data) return null;

  const rows = data as LibraryAssetRow[];
  const parsed = parseLibraryPublicFilename(filename);
  const picked = pickLibraryAssets(rows);

  const exact = picked.find(
    (item) => item.publicPath === `/library/${filename}`,
  );
  const byShortId = parsed
    ? rows.find((item) => item.id.toLowerCase().startsWith(parsed.shortId))
    : undefined;
  const matchId = exact?.id ?? byShortId?.id;
  if (!matchId) return null;

  const row = rows.find((item) => item.id === matchId);
  if (!row?.storage_path) return null;
  try {
    return await readAssetFile(row.storage_path);
  } catch {
    return null;
  }
}

export async function resolvePublishedLibraryFile(input: {
  slug: string;
  filename: string;
}): Promise<ResolvedLibraryFile | null> {
  const filename = sanitizeLibraryFilename(input.filename);
  const slug = input.slug.trim().toLowerCase();
  if (!filename || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return null;

  const fromStatic = await readStaticClientLibraryFile(slug, filename);
  if (fromStatic) {
    return { bytes: fromStatic, contentType: contentTypeOf(filename), filename };
  }

  const supabase = createAdminClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id, workspace_id, slug")
    .eq("slug", slug)
    .maybeSingle();

  if (!project?.id) return null;

  const fromProject = await readProjectLibraryFile(project.id, filename);
  if (fromProject) {
    return { bytes: fromProject, contentType: contentTypeOf(filename), filename };
  }

  const fromAsset = await readWorkspaceAssetFile(project.workspace_id, filename);
  if (fromAsset) {
    return { bytes: fromAsset, contentType: contentTypeOf(filename), filename };
  }

  return null;
}

export function libraryFileResponse(file: ResolvedLibraryFile): NextResponse {
  return new NextResponse(new Uint8Array(file.bytes), {
    headers: {
      "Content-Type": file.contentType,
      "Content-Disposition": `inline; filename="${file.filename.replace(/"/g, "")}"`,
      "Cache-Control": "public, max-age=86400",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
