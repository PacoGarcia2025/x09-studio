import fs from "node:fs/promises";
import path from "node:path";
import { resolveInsideAssets } from "@/lib/assets/paths";
import type { AssetStorageDriver } from "@/lib/storage/types";

export function createLocalStorageDriver(): AssetStorageDriver {
  return {
    id: "local",
    status: "ready",
    async writeFile(relativePath, bytes) {
      const absolute = resolveInsideAssets(relativePath);
      await fs.mkdir(path.dirname(absolute), { recursive: true });
      await fs.writeFile(absolute, bytes);
    },
    async readFile(relativePath) {
      const absolute = resolveInsideAssets(relativePath);
      const st = await fs.stat(absolute);
      if (!st.isFile()) throw new Error("Não é um arquivo");
      return fs.readFile(absolute);
    },
    async exists(relativePath) {
      try {
        const st = await fs.stat(resolveInsideAssets(relativePath));
        return st.isFile() || st.isDirectory();
      } catch {
        return false;
      }
    },
    async remove(relativePath) {
      const absolute = resolveInsideAssets(relativePath);
      await fs.rm(absolute, { recursive: true, force: true });
    },
  };
}
