import { isAssetKind, type AssetKind } from "@/lib/assets/kinds";

export const MAX_ASSET_BYTES = 24 * 1024 * 1024;

const EXT_KIND: Record<string, AssetKind> = {
  jpg: "image",
  jpeg: "image",
  png: "image",
  webp: "image",
  gif: "image",
  hdr: "hdri",
  exr: "hdri",
  glb: "mesh",
  gltf: "mesh",
  obj: "mesh",
  mp3: "audio",
  wav: "audio",
  ogg: "audio",
  mp4: "video",
  webm: "video",
  ktx2: "texture",
};

const BLOCKED_EXT = new Set([
  "exe",
  "bat",
  "cmd",
  "sh",
  "ps1",
  "js",
  "mjs",
  "cjs",
  "ts",
  "tsx",
  "jsx",
  "html",
  "htm",
  "php",
  "py",
  "rb",
  "jar",
  "dll",
  "so",
]);

export type ClassifiedUpload = {
  kind: AssetKind;
  extension: string;
  originalName: string;
};

export function extensionOf(filename: string): string {
  const base = filename.split(/[/\\]/).pop() ?? "";
  const dot = base.lastIndexOf(".");
  if (dot <= 0 || dot === base.length - 1) return "";
  return base.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function sanitizeOriginalName(filename: string): string {
  const base = filename.split(/[/\\]/).pop()?.trim() || "arquivo";
  return base.replace(/[^\w.\- ()[\]]+/g, "_").slice(0, 180);
}

export function classifyUpload(
  filename: string,
  kindOverride?: string | null,
): ClassifiedUpload | { error: string } {
  const originalName = sanitizeOriginalName(filename);
  const extension = extensionOf(originalName);

  if (!extension) {
    return { error: "O arquivo precisa de uma extensão conhecida." };
  }
  if (BLOCKED_EXT.has(extension)) {
    return { error: "Este tipo de arquivo não é permitido na biblioteca." };
  }
  if (!(extension in EXT_KIND) && kindOverride !== "other") {
    return {
      error: "Extensão não suportada. Use imagem, áudio, vídeo, HDRI, mesh ou textura.",
    };
  }

  const inferred = EXT_KIND[extension] ?? "other";
  const override = kindOverride?.trim();
  if (override) {
    if (!isAssetKind(override)) {
      return { error: "Tipo de asset inválido." };
    }
    return { kind: override, extension, originalName };
  }

  return { kind: inferred, extension, originalName };
}

export function isAllowedByteSize(bytes: number): boolean {
  return Number.isFinite(bytes) && bytes > 0 && bytes <= MAX_ASSET_BYTES;
}
