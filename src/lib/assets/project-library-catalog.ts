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

const LIBRARY_FILE_RE =
  /^(logo|image|mesh)-([0-9a-f]{8})-([a-z0-9][a-z0-9._-]{0,160})$/i;

export function sanitizeLibraryFilename(raw: string): string | null {
  const name = raw.replace(/\\/g, "/").split("/").pop()?.trim() ?? "";
  if (!name || name.includes("..") || name.length > 180) return null;
  if (!/^[a-zA-Z0-9._-]+$/.test(name)) return null;
  if (!/\.[a-z0-9]{2,5}$/i.test(name)) return null;
  return name;
}

export function parseLibraryPublicFilename(filename: string): {
  role: LibraryBuildRole;
  shortId: string;
} | null {
  const safe = sanitizeLibraryFilename(filename);
  if (!safe) return null;
  const match = LIBRARY_FILE_RE.exec(safe);
  if (!match) return null;
  return {
    role: match[1]!.toLowerCase() as LibraryBuildRole,
    shortId: match[2]!.toLowerCase(),
  };
}

export function collectLibrarySrcs(code: string): string[] {
  const found = new Set<string>();
  const re = /["'`](\/library\/[A-Za-z0-9._-]+)["'`]/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(code)) !== null) {
    const name = sanitizeLibraryFilename(match[1]!.slice("/library/".length));
    if (name) found.add(name);
  }
  return [...found];
}

/** /sites/{slug}/library/{file} ou /library/{file} */
export function matchLibraryRequestPath(pathname: string): {
  slug: string | null;
  filename: string;
} | null {
  const fromSites = pathname.match(
    /^\/sites\/([a-z0-9]+(?:-[a-z0-9]+)*)\/library\/([^/]+)$/i,
  );
  if (fromSites) {
    const filename = sanitizeLibraryFilename(fromSites[2] ?? "");
    if (!filename) return null;
    return { slug: fromSites[1]!.toLowerCase(), filename };
  }
  const fromRoot = pathname.match(/^\/library\/([^/]+)$/i);
  if (fromRoot) {
    const filename = sanitizeLibraryFilename(fromRoot[1] ?? "");
    if (!filename) return null;
    return { slug: null, filename };
  }
  return null;
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
