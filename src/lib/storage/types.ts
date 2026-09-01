/**
 * Storage de assets — interface única.
 * A aplicação só fala com AssetStorageDriver; o backend (disco, R2, S3…) troca por env.
 */

export const ASSET_STORAGE_DRIVER_IDS = [
  "local",
  "supabase",
  "s3",
  "r2",
  "minio",
  "azure",
  "gcs",
] as const;

export type AssetStorageDriverId = (typeof ASSET_STORAGE_DRIVER_IDS)[number];

export type AssetStorageDriverStatus = "ready" | "planned";

export interface AssetStorageDriver {
  readonly id: AssetStorageDriverId;
  readonly status: AssetStorageDriverStatus;
  writeFile(relativePath: string, bytes: Uint8Array): Promise<void>;
  readFile(relativePath: string): Promise<Buffer>;
  exists(relativePath: string): Promise<boolean>;
  /** Remove arquivo ou diretório (prefixo). */
  remove(relativePath: string): Promise<void>;
}

export function isAssetStorageDriverId(
  value: string,
): value is AssetStorageDriverId {
  return (ASSET_STORAGE_DRIVER_IDS as readonly string[]).includes(value);
}
