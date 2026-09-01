import {
  isAssetStorageDriverId,
  type AssetStorageDriverId,
} from "@/lib/storage/types";

const DEFAULT_DRIVER: AssetStorageDriverId = "local";

export function getAssetStorageDriverId(): AssetStorageDriverId {
  const raw = process.env.STUDIO_ASSET_STORAGE?.trim().toLowerCase();
  if (raw && isAssetStorageDriverId(raw)) return raw;
  return DEFAULT_DRIVER;
}
