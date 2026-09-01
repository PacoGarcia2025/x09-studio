import { beforeEach, describe, expect, it } from "vitest";
import { createLocalAssetProcessor } from "@/lib/asset-jobs/processors/local";
import { resetCapabilityProvidersForTests } from "@/lib/capability-router/register";
import { createLocalCapabilityProvider } from "@/lib/capability-router/providers/local";
import type { AssetJobRow } from "@/lib/asset-jobs/types";
import type { AssetStorageDriver } from "@/lib/storage/types";

function job(overrides: Partial<AssetJobRow>): AssetJobRow {
  return {
    id: "j1",
    workspace_id: "w1",
    project_id: null,
    asset_id: "a1",
    created_by: "u1",
    kind: "image",
    operation: "ingest",
    provider_id: "local",
    status: "running",
    input_path: "w1/image/a1/source.png",
    output_path: null,
    error_message: null,
    meta: {},
    credits_reserved: 0,
    started_at: null,
    finished_at: null,
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

function memoryStorage(files: Set<string>): AssetStorageDriver {
  return {
    id: "local",
    status: "ready",
    async writeFile(path) {
      files.add(path);
    },
    async readFile() {
      return Buffer.from("");
    },
    async exists(path) {
      return files.has(path);
    },
    async remove(path) {
      files.delete(path);
    },
  };
}

describe("local asset processor (via Capability Router)", () => {
  beforeEach(() => {
    resetCapabilityProvidersForTests([createLocalCapabilityProvider()]);
  });
  it("ingest confirma arquivo no storage", async () => {
    const files = new Set(["w1/image/a1/source.png"]);
    const result = await createLocalAssetProcessor().process({
      job: job({ operation: "ingest" }),
      storage: memoryStorage(files),
    });
    expect(result.status).toBe("done");
    expect(result.outputPath).toBe("w1/image/a1/source.png");
  });

  it("ingest falha se o arquivo não existe", async () => {
    const result = await createLocalAssetProcessor().process({
      job: job({ operation: "ingest" }),
      storage: memoryStorage(new Set()),
    });
    expect(result.status).toBe("failed");
  });

  it("generate sem provider vira skipped via router", async () => {
    const result = await createLocalAssetProcessor().process({
      job: job({ operation: "generate", kind: "mesh" }),
      storage: memoryStorage(new Set()),
    });
    expect(result.status).toBe("skipped");
    expect(result.message).toMatch(/mesh\.generate|Nenhum provider/i);
  });
});
