import fs from "node:fs";
import path from "node:path";
import type { AssetKind } from "@/lib/assets/kinds";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function assertAssetUuid(value: string, label = "id"): string {
  if (!UUID_RE.test(value)) {
    throw new Error(`${label} inválido`);
  }
  return value;
}

/**
 * Raiz da biblioteca — irmã de projects, não misturada com o código gerado.
 * VPS: /var/lib/x09-studio/assets
 */
export function getAssetsRoot(): string {
  const explicit = process.env.STUDIO_ASSETS_ROOT?.trim();
  if (explicit) return path.resolve(explicit);

  const projects = process.env.STUDIO_PROJECTS_ROOT?.trim();
  if (projects) {
    return path.join(path.dirname(path.resolve(projects)), "assets");
  }

  throw new Error(
    "STUDIO_ASSETS_ROOT ou STUDIO_PROJECTS_ROOT não configurado.",
  );
}

export function buildAssetRelativeDir(
  workspaceId: string,
  kind: AssetKind,
  assetId: string,
): string {
  assertAssetUuid(workspaceId, "workspaceId");
  assertAssetUuid(assetId, "assetId");
  return `${workspaceId}/${kind}/${assetId}`;
}

export function buildAssetRelativeFile(
  workspaceId: string,
  kind: AssetKind,
  assetId: string,
  extension: string,
): string {
  const ext = extension.replace(/^\./, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!ext || ext.length > 8) {
    throw new Error("Extensão inválida");
  }
  return `${buildAssetRelativeDir(workspaceId, kind, assetId)}/source.${ext}`;
}

export function resolveInsideAssets(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized.includes("\0")) {
    throw new Error("Caminho inválido");
  }
  if (normalized.split("/").some((p) => p === "..")) {
    throw new Error("Path traversal bloqueado");
  }

  const root = getAssetsRoot();
  const absolute = path.resolve(root, normalized);
  const relative = path.relative(root, absolute);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Path fora da biblioteca de assets");
  }
  return absolute;
}

export function assetsRootConfigured(): boolean {
  try {
    getAssetsRoot();
    return true;
  } catch {
    return false;
  }
}

export function assetsRootExists(): boolean {
  try {
    return fs.statSync(getAssetsRoot()).isDirectory();
  } catch {
    return false;
  }
}
