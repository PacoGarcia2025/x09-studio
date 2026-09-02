import { describe, expect, it, beforeEach } from "vitest";
import fs from "node:fs/promises";
import { createFakeMeshProvider } from "@/lib/capability-router/providers/fake-mesh";
import { buildFakeMeshGlb, isGlbMagic } from "@/lib/capability-router/providers/fake-mesh-glb";
import { createLocalCapabilityProvider } from "@/lib/capability-router/providers/local";
import { createTrellisProvider } from "@/lib/capability-router/providers/trellis";
import { huggingfaceTokenFromEnv } from "@/lib/capability-router/providers/trellis-run";
import { resetCapabilityProvidersForTests } from "@/lib/capability-router/register";
import { resolveCapability } from "@/lib/capability-router";
import { createExecutionContext } from "@/lib/capability-router/context";
import type { AssetJobRow } from "@/lib/asset-jobs/types";
import type { AssetStorageDriver } from "@/lib/storage/types";

const policiesCpu = {
  generationEnabled: true,
  paidApisAllowed: false,
  gpuAvailable: false,
  internetAllowed: true,
};

const policiesGpu = { ...policiesCpu, gpuAvailable: true };

function job(): AssetJobRow {
  return {
    id: "j1",
    workspace_id: "w1",
    project_id: null,
    asset_id: "a1",
    created_by: "u1",
    kind: "mesh",
    operation: "generate",
    provider_id: "local",
    status: "running",
    input_path: "w1/image/src/source.png",
    output_path: "w1/mesh/a1/source.glb",
    error_message: null,
    meta: { capability: "mesh.generate" },
    credits_reserved: 0,
    started_at: null,
    finished_at: null,
    created_at: "",
    updated_at: "",
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

describe("TRELLIS Provider (integração sem Core)", () => {
  beforeEach(() => {
    delete process.env.STUDIO_RUNPOD_API_KEY;
    delete process.env.STUDIO_RUNPOD_POD_ID;
    delete process.env.RUNPOD_API_KEY;
    resetCapabilityProvidersForTests([
      createLocalCapabilityProvider(),
      createFakeMeshProvider(),
      createTrellisProvider(),
    ]);
  });

  it("sem GPU o Router continua no fake-mesh", () => {
    const result = resolveCapability("mesh.generate", policiesCpu);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.provider.manifest.id).toBe("fake-mesh");
    }
  });

  it("com GPU o Router escolhe trellis — sem alterar resolve.ts", () => {
    const result = resolveCapability("mesh.generate", policiesGpu);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.provider.manifest.id).toBe("trellis");
      expect(result.provider.manifest.requiresGpu).toBe(true);
    }
  });

  it("execute falha fechado sem sidecar — não inventa GLB", async () => {
    const previous = process.env.STUDIO_TRELLIS_PYTHON;
    delete process.env.STUDIO_TRELLIS_PYTHON;
    try {
      const files = new Map<string, Uint8Array>([
        ["w1/image/src/source.png", new Uint8Array([1, 2, 3])],
      ]);
      const ctx = createExecutionContext({
        job: job(),
        capability: "mesh.generate",
        storage: memoryStorage(files),
        policies: policiesGpu,
      });
      const result = await createTrellisProvider().execute(ctx);
      expect(result.status).toBe("failed");
      expect(result.message).toMatch(/STUDIO_TRELLIS_PYTHON/);
      expect(files.has("w1/mesh/a1/source.glb")).toBe(false);
    } finally {
      if (previous === undefined) {
        delete process.env.STUDIO_TRELLIS_PYTHON;
      } else {
        process.env.STUDIO_TRELLIS_PYTHON = previous;
      }
    }
  });

  it("cede jobs comerciais a outro provider", async () => {
    const ctx = createExecutionContext({
      job: {
        ...job(),
        meta: { capability: "mesh.generate", meshTier: "flagship" },
      },
      capability: "mesh.generate",
      storage: memoryStorage(new Map()),
      policies: policiesGpu,
    });
    const result = await createTrellisProvider().execute(ctx);
    expect(result.status).toBe("skipped");
  });

  it("aceita HUGGINGFACE_TOKEN / HUGGINGFACE_API_KEY / HF_TOKEN", () => {
    expect(
      huggingfaceTokenFromEnv({ HUGGINGFACE_TOKEN: "tok-a" } as NodeJS.ProcessEnv),
    ).toBe("tok-a");
    expect(
      huggingfaceTokenFromEnv({ HUGGINGFACE_API_KEY: "tok-b" } as NodeJS.ProcessEnv),
    ).toBe("tok-b");
    expect(
      huggingfaceTokenFromEnv({
        HUGGING_FACE_HUB_TOKEN: "tok-d",
      } as NodeJS.ProcessEnv),
    ).toBe("tok-d");
  });

  it("grava no storage o GLB devolvido pelo sidecar (sem mudar o Core)", async () => {
    const previous = process.env.STUDIO_TRELLIS_PYTHON;
    process.env.STUDIO_TRELLIS_PYTHON = "python";
    try {
      const files = new Map<string, Uint8Array>([
        ["w1/image/src/source.png", new Uint8Array(64).fill(7)],
      ]);
      const sample = buildFakeMeshGlb();
      const provider = createTrellisProvider({
        run: async ({ outputFile }) => {
          await fs.writeFile(outputFile, sample);
          return { ok: true, metrics: { elapsedMs: 1200, vramPeakMb: 8192 } };
        },
      });
      const result = await provider.execute(
        createExecutionContext({
          job: job(),
          capability: "mesh.generate",
          storage: memoryStorage(files),
          policies: policiesGpu,
        }),
      );
      expect(result.status).toBe("done");
      expect(result.outputPath).toBe("w1/mesh/a1/source.glb");
      expect(isGlbMagic(files.get("w1/mesh/a1/source.glb")!)).toBe(true);
      expect(result.meta?.byteSize).toBe(sample.byteLength);
      expect(result.meta?.vramPeakMb).toBe(8192);
      expect(result.meta?.elapsedMs).toBeGreaterThanOrEqual(1200);
    } finally {
      if (previous === undefined) {
        delete process.env.STUDIO_TRELLIS_PYTHON;
      } else {
        process.env.STUDIO_TRELLIS_PYTHON = previous;
      }
    }
  });

  it("sobe a GPU no pedido e desliga no finally mesmo se a inferência falhar", async () => {
    const previous = process.env.STUDIO_TRELLIS_PYTHON;
    process.env.STUDIO_TRELLIS_PYTHON = "python";
    const events: string[] = [];
    try {
      const files = new Map<string, Uint8Array>([
        ["w1/image/src/source.png", new Uint8Array(64).fill(7)],
      ]);
      const provider = createTrellisProvider({
        gpu: {
          configured: () => true,
          acquire: async () => {
            events.push("start");
            return { podId: "pod1", host: "10.0.0.1", port: 22, username: "root" };
          },
          release: async () => {
            events.push("stop");
          },
        },
        remoteRun: async () => ({
          ok: false,
          message: "inferência falhou de propósito",
        }),
      });
      const result = await provider.execute(
        createExecutionContext({
          job: job(),
          capability: "mesh.generate",
          storage: memoryStorage(files),
          policies: policiesGpu,
        }),
      );
      expect(result.status).toBe("failed");
      expect(events).toEqual(["start", "stop"]);
    } finally {
      if (previous === undefined) {
        delete process.env.STUDIO_TRELLIS_PYTHON;
      } else {
        process.env.STUDIO_TRELLIS_PYTHON = previous;
      }
    }
  });

  it("com GPU sob demanda usa remoteRun e desliga depois do GLB", async () => {
    const previous = process.env.STUDIO_TRELLIS_PYTHON;
    process.env.STUDIO_TRELLIS_PYTHON = "python";
    const events: string[] = [];
    try {
      const files = new Map<string, Uint8Array>([
        ["w1/image/src/source.png", new Uint8Array(64).fill(7)],
      ]);
      const sample = buildFakeMeshGlb();
      const provider = createTrellisProvider({
        gpu: {
          configured: () => true,
          acquire: async () => {
            events.push("start");
            return { podId: "pod1", host: "10.0.0.1", port: 22, username: "root" };
          },
          release: async () => {
            events.push("stop");
          },
        },
        remoteRun: async ({ outputFile }) => {
          events.push("infer");
          await fs.writeFile(outputFile, sample);
          return { ok: true, metrics: { elapsedMs: 50 } };
        },
      });
      const result = await provider.execute(
        createExecutionContext({
          job: job(),
          capability: "mesh.generate",
          storage: memoryStorage(files),
          policies: policiesGpu,
        }),
      );
      expect(result.status).toBe("done");
      expect(events).toEqual(["start", "infer", "stop"]);
      expect(isGlbMagic(files.get("w1/mesh/a1/source.glb")!)).toBe(true);
    } finally {
      if (previous === undefined) {
        delete process.env.STUDIO_TRELLIS_PYTHON;
      } else {
        process.env.STUDIO_TRELLIS_PYTHON = previous;
      }
    }
  });

  it("propaga falha explícita de CUDA do sidecar", async () => {
    const previous = process.env.STUDIO_TRELLIS_PYTHON;
    process.env.STUDIO_TRELLIS_PYTHON = "python";
    try {
      const files = new Map<string, Uint8Array>([
        ["w1/image/src/source.png", new Uint8Array(64).fill(7)],
      ]);
      const provider = createTrellisProvider({
        run: async () => ({
          ok: false,
          message: "CUDA indisponível neste Python. TRELLIS exige NVIDIA GPU ≥16GB (Linux).",
        }),
      });
      const result = await provider.execute(
        createExecutionContext({
          job: job(),
          capability: "mesh.generate",
          storage: memoryStorage(files),
          policies: policiesGpu,
        }),
      );
      expect(result.status).toBe("failed");
      expect(result.message).toMatch(/CUDA/i);
      expect(files.has("w1/mesh/a1/source.glb")).toBe(false);
    } finally {
      if (previous === undefined) {
        delete process.env.STUDIO_TRELLIS_PYTHON;
      } else {
        process.env.STUDIO_TRELLIS_PYTHON = previous;
      }
    }
  });
});
