export type LibraryBuildRole = "logo" | "image" | "mesh";

export type LibraryBuildItem = {
  id: string;
  kind: string;
  originalName: string;
  role: LibraryBuildRole;
  publicPath: string;
};

export type LibraryAssetRow = {
  id: string;
  kind: string;
  original_name: string;
  storage_path: string;
  byte_size: number;
  meta: Record<string, unknown> | null;
  status: string;
};

const LIMITS: Record<LibraryBuildRole, number> = {
  logo: 2,
  image: 4,
  mesh: 3,
};

export function classifyLibraryRole(asset: {
  kind: string;
  original_name: string;
  meta?: Record<string, unknown> | null;
}): LibraryBuildRole | null {
  const name = asset.original_name.toLowerCase();
  const cap = String(asset.meta?.capability ?? "");
  const isLogoName =
    cap === "mesh.logo" ||
    /-logo(\.|$)/i.test(asset.original_name) ||
    /\blogo\b|marca|brand/i.test(name);

  if (asset.kind === "mesh") return isLogoName ? "logo" : "mesh";
  if (
    asset.kind === "image" ||
    asset.kind === "thumbnail" ||
    asset.kind === "texture"
  ) {
    return isLogoName ? "logo" : "image";
  }
  return null;
}

export function fileSlug(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 36);
  return slug || "asset";
}

function extOf(name: string, storagePath: string): string {
  const fromName = name.split(".").pop()?.toLowerCase() ?? "";
  if (fromName && fromName.length <= 5 && fromName !== name.toLowerCase()) {
    return fromName;
  }
  const fromPath = storagePath.split(".").pop()?.toLowerCase() ?? "bin";
  return fromPath.slice(0, 5);
}

export function pickLibraryAssets(rows: LibraryAssetRow[]): LibraryBuildItem[] {
  const counts: Record<LibraryBuildRole, number> = {
    logo: 0,
    image: 0,
    mesh: 0,
  };
  const picked: LibraryBuildItem[] = [];

  for (const row of rows) {
    if (row.status === "archived" || !(row.byte_size > 0) || !row.storage_path) {
      continue;
    }
    const role = classifyLibraryRole(row);
    if (!role) continue;
    if (counts[role] >= LIMITS[role]) continue;
    counts[role] += 1;
    const shortId = row.id.slice(0, 8);
    const ext = extOf(row.original_name, row.storage_path);
    const publicPath = `/library/${role}-${shortId}-${fileSlug(row.original_name)}.${ext}`;
    picked.push({
      id: row.id,
      kind: row.kind,
      originalName: row.original_name,
      role,
      publicPath,
    });
  }

  return picked;
}

export function formatLibraryCatalogPrompt(items: LibraryBuildItem[]): string {
  if (items.length === 0) return "";
  const lines = items.map((item) => {
    const use =
      item.role === "logo"
        ? "header, favicon e marca"
        : item.role === "mesh"
          ? "viewer 3D (model-viewer src=...)"
          : "hero, galeria ou cards";
    return `- ${item.role}: ${item.publicPath} (${item.originalName}) — ${use}`;
  });
  return `Galeria do cliente já copiada para public/library/ (USE estes paths; não invente URLs; não gere assets novos; não gaste créditos):
${lines.join("\n")}
Regras:
- Logo: <img src="/library/..." alt="marca" /> no header.
- Fotos: prefira estes ficheiros a imagens de stock.
- Mesh GLB: <model-viewer src="/library/....glb" camera-controls auto-rotate style={{width:'100%',height:'24rem'}}></model-viewer> se o pedido for 3D, jogo ou produto.
- Paths começam por /library/ — o Vite serve public/ na raiz.`;
}
