/**
 * Tipos da biblioteca de assets do Studio — não só IA.
 * Formatos (glb, png, hdr) não entram aqui: são extensão/MIME, não kind.
 */
export const ASSET_KINDS = [
  "mesh",
  "image",
  "audio",
  "video",
  "texture",
  "material",
  "animation",
  "hdri",
  "thumbnail",
  "other",
] as const;

export type AssetKind = (typeof ASSET_KINDS)[number];

export const ASSET_LIBRARY_STATUSES = [
  "ready",
  "archived",
  "missing",
] as const;

export type AssetLibraryStatus = (typeof ASSET_LIBRARY_STATUSES)[number];

export const ASSET_SOURCES = [
  "upload",
  "generated",
  "imported",
  "builder",
  "marketplace",
  "template",
  "plugin",
] as const;

export type AssetSource = (typeof ASSET_SOURCES)[number];

export function isAssetKind(value: string): value is AssetKind {
  return (ASSET_KINDS as readonly string[]).includes(value);
}

export function isAssetLibraryStatus(
  value: string,
): value is AssetLibraryStatus {
  return (ASSET_LIBRARY_STATUSES as readonly string[]).includes(value);
}

export function isAssetSource(value: string): value is AssetSource {
  return (ASSET_SOURCES as readonly string[]).includes(value);
}
