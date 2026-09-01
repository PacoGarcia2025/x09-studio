import { describe, expect, it } from "vitest";
import { getAssetStorageDriverId } from "@/lib/storage/config";
import { getAssetStorage, listAssetStorageDrivers } from "@/lib/storage/registry";

describe("storage registry", () => {
  it("default é disco local", () => {
    const previous = process.env.STUDIO_ASSET_STORAGE;
    delete process.env.STUDIO_ASSET_STORAGE;
    expect(getAssetStorageDriverId()).toBe("local");
    expect(getAssetStorage().id).toBe("local");
    expect(getAssetStorage().status).toBe("ready");
    if (previous === undefined) delete process.env.STUDIO_ASSET_STORAGE;
    else process.env.STUDIO_ASSET_STORAGE = previous;
  });

  it("backends de nuvem existem como planned, sem SDK", () => {
    const ids = listAssetStorageDrivers().map((d) => d.id);
    expect(ids).toEqual([
      "local",
      "supabase",
      "s3",
      "r2",
      "minio",
      "azure",
      "gcs",
    ]);
    expect(listAssetStorageDrivers().find((d) => d.id === "r2")?.status).toBe(
      "planned",
    );
  });

  it("driver planned recusa write", async () => {
    const previous = process.env.STUDIO_ASSET_STORAGE;
    process.env.STUDIO_ASSET_STORAGE = "r2";
    const driver = getAssetStorage();
    expect(driver.id).toBe("r2");
    await expect(driver.writeFile("a/b", new Uint8Array([1]))).rejects.toThrow(
      /planejado/,
    );
    if (previous === undefined) delete process.env.STUDIO_ASSET_STORAGE;
    else process.env.STUDIO_ASSET_STORAGE = previous;
  });
});
