import { describe, expect, it, beforeEach } from "vitest";
import { createExecutionContext } from "@/lib/capability-router/context";
import { createFakeMeshProvider } from "@/lib/capability-router/providers/fake-mesh";
import {
  buildFakeMeshGlb,
  isGlbMagic,
} from "@/lib/capability-router/providers/fake-mesh-glb";
import { createLocalCapabilityProvider } from "@/lib/capability-router/providers/local";
import { resetCapabilityProvidersForTests } from "@/lib/capability-router/register";
import { resolveCapability } from "@/lib/capability-router";
import { createLocalAssetProcessor } from "@/lib/asset-jobs/processors/local";
import type { AssetJobRow } from "@/lib/asset-jobs/types";
import type { AssetStorageDriver } from "@/lib/storage/types";

const policiesOn = {
  generationEnabled: true,
  paidApisAllowed: false,
  gpuAvailable: false,
  internetAllowed: true,
};

function meshJob(overrides: Partial<AssetJobRow> = {}): AssetJobRow {
  return {
    id: "j-mesh",
    workspace_id: "11111111-1111-4111-8111-111111111111",
    project_id: null,
    asset_id: "22222222-2222-4222-8222-222222222222",
    created_by: "u1",
    kind: "mesh",
    operation: "generate",
    provider_id: "local",
    status: "running",
    input_path: null,
    output_path:
      "11111111-1111-4111-8111-111111111111/mesh/22222222-2222-4222-8222-222222222222/source.glb",
    error_message: null,
    meta: { capability: "mesh.generate" },
    credits_reserved: 0,
    started_at: null,
    finished_at: null,
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

function memoryStorage(files: Map<string, Uint8Array>): AssetStorageDriver {
  return {
    id: "local",
    status: "ready",
    async writeFile(path, bytes) {
      files.set(path, bytes);
    },
    async readFile(path) {
      const found = files.get(path);
      if (!found) throw new Error("missing");
      return Buffer.from(found);
    },
    async exists(path) {
      return files.has(path);
    },
    async remove(path) {
      files.delete(path);
    },
  };
}

describe("FakeMeshProvider (Fase 5)", () => {
  beforeEach(() => {
    resetCapabilityProvidersForTests([
      createLocalCapabilityProvider(),
      createFakeMeshProvider(),
    ]);
  });

  it("produz um GLB com magic glTF", () => {
    const glb = buildFakeMeshGlb();
    expect(isGlbMagic(glb)).toBe(true);
    expect(glb.byteLength).toBeGreaterThan(100);
  });

  it("o Router escolhe fake-mesh para mesh.generate sem GPU", () => {
    const result = resolveCapability("mesh.generate", policiesOn);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.provider.manifest.id).toBe("fake-mesh");
      expect(result.provider.manifest.requiresGpu).toBe(false);
    }
  });

  it("respeita a política generationEnabled", () => {
    const result = resolveCapability("mesh.generate", {
      ...policiesOn,
      generationEnabled: false,
    });
    expect(result.ok).toBe(false);
  });

  it("grava o GLB via ExecutionContext.storage", async () => {
    const files = new Map<string, Uint8Array>();
    const job = meshJob();
    const ctx = createExecutionContext({
      job,
      capability: "mesh.generate",
      storage: memoryStorage(files),
      policies: policiesOn,
    });
    const result = await createFakeMeshProvider().execute(ctx);
    expect(result.status).toBe("done");
    expect(result.outputPath).toBe(job.output_path);
    const written = files.get(job.output_path!);
    expect(written).toBeDefined();
    expect(isGlbMagic(written!)).toBe(true);
  });

  it("não gera o triângulo de teste para objeto simples (GPU)", async () => {
    const files = new Map<string, Uint8Array>();
    const ctx = createExecutionContext({
      job: meshJob({
        meta: { capability: "mesh.generate", meshTier: "gpu" },
      }),
      capability: "mesh.generate",
      storage: memoryStorage(files),
      policies: policiesOn,
    });
    const result = await createFakeMeshProvider().execute(ctx);
    expect(result.status).toBe("skipped");
    expect(files.size).toBe(0);
  });

  it("não gera o cubo de exemplo para jobs comerciais", async () => {
    const files = new Map<string, Uint8Array>();
    const ctx = createExecutionContext({
      job: meshJob({
        meta: { capability: "mesh.generate", meshTier: "game" },
      }),
      capability: "mesh.generate",
      storage: memoryStorage(files),
      policies: policiesOn,
    });
    const result = await createFakeMeshProvider().execute(ctx);
    expect(result.status).toBe("skipped");
    expect(files.size).toBe(0);
  });

  it("o processor local despacha mesh.generate sem conhecer o stub", async () => {
    const previous = process.env.STUDIO_AI_ENGINE_GENERATION_ENABLED;
    process.env.STUDIO_AI_ENGINE_GENERATION_ENABLED = "true";
    try {
      const files = new Map<string, Uint8Array>();
      const job = meshJob();
      const result = await createLocalAssetProcessor().process({
        job,
        storage: memoryStorage(files),
      });
      expect(result.status).toBe("done");
      expect(result.meta?.providerId).toBe("fake-mesh");
      expect(result.meta?.capability).toBe("mesh.generate");
      expect(isGlbMagic(files.get(job.output_path!)!)).toBe(true);
    } finally {
      if (previous === undefined) {
        delete process.env.STUDIO_AI_ENGINE_GENERATION_ENABLED;
      } else {
        process.env.STUDIO_AI_ENGINE_GENERATION_ENABLED = previous;
      }
    }
  });
});
