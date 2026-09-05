import { describe, expect, it, beforeEach } from "vitest";
import { createExecutionContext } from "@/lib/capability-router/context";
import { createIdleMotionProvider } from "@/lib/capability-router/providers/idle-motion";
import { buildFakeMeshGlb, isGlbMagic } from "@/lib/capability-router/providers/fake-mesh-glb";
import { glbHasIdleMotion } from "@/lib/capability-router/providers/idle-motion-glb";
import { createLocalCapabilityProvider } from "@/lib/capability-router/providers/local";
import { resetCapabilityProvidersForTests } from "@/lib/capability-router/register";
import { resolveCapability } from "@/lib/capability-router";
import type { AssetJobRow } from "@/lib/asset-jobs/types";
import type { AssetStorageDriver } from "@/lib/storage/types";

const policies = {
  generationEnabled: true,
  paidApisAllowed: false,
  gpuAvailable: false,
  internetAllowed: true,
};

function job(): AssetJobRow {
  return {
    id: "j-idle",
    workspace_id: "w1",
    project_id: null,
    asset_id: "a2",
    created_by: "u1",
    kind: "mesh",
    operation: "generate",
    provider_id: "local",
    status: "running",
    input_path: "w1/mesh/a1/source.glb",
    output_path: "w1/mesh/a2/motion.glb",
    error_message: null,
    meta: { capability: "animation.generate", sourceMode: "idle-motion" },
    credits_reserved: 3,
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

describe("idle motion provider", () => {
  beforeEach(() => {
    resetCapabilityProvidersForTests([
      createLocalCapabilityProvider(),
      createIdleMotionProvider(),
    ]);
  });

  it("o Router escolhe idle-motion para animation.generate", () => {
    const result = resolveCapability("animation.generate", policies);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.provider.manifest.id).toBe("idle-motion");
  });

  it("grava um GLB com idle a partir do mesh de origem", async () => {
    const files = new Map<string, Uint8Array>([
      ["w1/mesh/a1/source.glb", buildFakeMeshGlb()],
    ]);
    const result = await createIdleMotionProvider().execute(
      createExecutionContext({
        job: job(),
        capability: "animation.generate",
        storage: memoryStorage(files),
        policies,
      }),
    );
    expect(result.status).toBe("done");
    const out = files.get("w1/mesh/a2/motion.glb");
    expect(out).toBeTruthy();
    expect(isGlbMagic(out!)).toBe(true);
    expect(glbHasIdleMotion(out!)).toBe(true);
    expect(result.meta?.hasIdleMotion).toBe(true);
  });
});
