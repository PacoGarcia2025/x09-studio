import { getAssetStorageDriverId } from "@/lib/storage/config";
import { createLocalStorageDriver } from "@/lib/storage/drivers/local";
import { createPlannedStorageDriver } from "@/lib/storage/drivers/planned";
import type { AssetStorageDriver } from "@/lib/storage/types";

export function getAssetStorage(): AssetStorageDriver {
  const id = getAssetStorageDriverId();
  if (id === "local") return createLocalStorageDriver();
  return createPlannedStorageDriver(id);
}

export function listAssetStorageDrivers(): AssetStorageDriver[] {
  return [
    createLocalStorageDriver(),
    createPlannedStorageDriver("supabase"),
    createPlannedStorageDriver("s3"),
    createPlannedStorageDriver("r2"),
    createPlannedStorageDriver("minio"),
    createPlannedStorageDriver("azure"),
    createPlannedStorageDriver("gcs"),
  ];
}
