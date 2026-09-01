import type {
  AssetStorageDriver,
  AssetStorageDriverId,
} from "@/lib/storage/types";

function notReady(id: AssetStorageDriverId): Error {
  return new Error(
    `Storage "${id}" está planejado e ainda não foi conectado. Use STUDIO_ASSET_STORAGE=local.`,
  );
}

/** Adapter vazio — mesma interface, sem SDK de nuvem nesta fase. */
export function createPlannedStorageDriver(
  id: Exclude<AssetStorageDriverId, "local">,
): AssetStorageDriver {
  return {
    id,
    status: "planned",
    async writeFile() {
      throw notReady(id);
    },
    async readFile() {
      throw notReady(id);
    },
    async exists() {
      throw notReady(id);
    },
    async remove() {
      throw notReady(id);
    },
  };
}
