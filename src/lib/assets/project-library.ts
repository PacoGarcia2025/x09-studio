import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { readAssetFile } from "@/lib/assets/storage.server";
import {
  pickLibraryAssets,
  type LibraryAssetRow,
  type LibraryBuildItem,
} from "@/lib/assets/project-library-catalog";
import { writeProjectBytes } from "@/lib/projects/fs.server";

export type { LibraryBuildItem } from "@/lib/assets/project-library-catalog";
export {
  classifyLibraryRole,
  formatLibraryCatalogPrompt,
  pickLibraryAssets,
} from "@/lib/assets/project-library-catalog";

export async function syncWorkspaceLibraryIntoProject(input: {
  projectId: string;
  workspaceId: string;
  supabase: SupabaseClient;
}): Promise<LibraryBuildItem[]> {
  const { data, error } = await input.supabase
    .from("assets")
    .select("id, kind, original_name, storage_path, byte_size, meta, status")
    .eq("workspace_id", input.workspaceId)
    .neq("status", "archived")
    .order("created_at", { ascending: false })
    .limit(40);

  if (error || !data) return [];

  const rows = data as LibraryAssetRow[];
  const picked = pickLibraryAssets(rows);
  const byId = new Map(rows.map((row) => [row.id, row]));

  const written: LibraryBuildItem[] = [];
  for (const item of picked) {
    const row = byId.get(item.id);
    if (!row) continue;
    try {
      const bytes = await readAssetFile(row.storage_path);
      await writeProjectBytes(
        input.projectId,
        `public${item.publicPath}`,
        bytes,
      );
      written.push(item);
    } catch (err) {
      console.warn(
        "[library] falhou copiar",
        item.publicPath,
        err instanceof Error ? err.message : err,
      );
    }
  }

  return written;
}
