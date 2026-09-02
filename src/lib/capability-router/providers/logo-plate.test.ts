import { describe, expect, it, beforeEach } from "vitest";
import { createExecutionContext } from "@/lib/capability-router/context";
import { createLogoPlateProvider } from "@/lib/capability-router/providers/logo-plate";
import {
  buildLogoPlateGlb,
  imageMime,
} from "@/lib/capability-router/providers/logo-plate-glb";
import { isGlbMagic } from "@/lib/capability-router/providers/fake-mesh-glb";
import { createLocalCapabilityProvider } from "@/lib/capability-router/providers/local";
import { resetCapabilityProvidersForTests } from "@/lib/capability-router/register";
import { resolveCapability } from "@/lib/capability-router";
import type { AssetJobRow } from "@/lib/asset-jobs/types";
import type { AssetStorageDriver } from "@/lib/storage/types";

const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

const policiesOn = {
  generationEnabled: true,
  paidApisAllowed: false,
  gpuAvailable: false,
  internetAllowed: true,
};

function job(overrides: Partial<AssetJobRow> = {}): AssetJobRow {
  return {
    id: "j-logo",
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
    meta: { capability: "mesh.logo" },
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

describe("Logo plate (mesh.logo)", () => {
  beforeEach(() => {
    resetCapabilityProvidersForTests([
      createLocalCapabilityProvider(),
      createLogoPlateProvider(),
    ]);
  });

  it("reconhece PNG", () => {
    expect(imageMime(PNG_1X1)).toBe("image/png");
  });

  it("decodifica PNG 1x1", async () => {
    const { decodePngRgba } = await import(
      "@/lib/capability-router/providers/logo-plate-png"
    );
    const decoded = decodePngRgba(PNG_1X1);
    expect(decoded.width).toBe(1);
    expect(decoded.height).toBe(1);
    expect(decoded.rgba.length).toBe(4);
  });

  it("o Router escolhe logo-plate para mesh.logo sem GPU", () => {
    const result = resolveCapability("mesh.logo", policiesOn);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.provider.manifest.id).toBe("logo-plate");
      expect(result.provider.manifest.requiresGpu).toBe(false);
    }
  });

  it("grava um GLB com a imagem embutida", async () => {
    const files = new Map<string, Uint8Array>([
      ["w1/image/src/source.png", PNG_1X1],
    ]);
    const ctx = createExecutionContext({
      job: job({ meta: { capability: "mesh.logo", thickness: 0.28 } }),
      capability: "mesh.logo",
      storage: memoryStorage(files),
      policies: policiesOn,
    });
    const result = await createLogoPlateProvider().execute(ctx);
    expect(result.status).toBe("done");
    expect(result.meta?.thickness).toBe(0.28);
    const glb = files.get("w1/mesh/a1/source.glb");
    expect(glb).toBeTruthy();
    expect(isGlbMagic(glb!)).toBe(true);
    const built = buildLogoPlateGlb(PNG_1X1);
    expect(built.byteLength).toBeGreaterThan(100);
    expect(new TextDecoder().decode(built)).toContain("OPAQUE");
    const { json } = parseGlb(built);
    expect(json.meshes?.[0]?.primitives?.length).toBe(2);
  });

  it("aplica a grossura pedida no eixo Z", () => {
    const thick = 0.24;
    const glb = buildLogoPlateGlb(PNG_1X1, { thickness: thick });
    const { json } = parseGlb(glb);
    const pos = json.accessors.find((a) => a.type === "VEC3" && a.max);
    expect(pos?.max?.[2]).toBeCloseTo(thick / 2, 5);
    expect(pos?.min?.[2]).toBeCloseTo(-thick / 2, 5);
    expect(new TextDecoder().decode(glb)).toContain("NORMAL");
  });

  it("mapeia o topo da imagem para o topo do mesh (glTF UV)", () => {
    const glb = buildLogoPlateGlb(PNG_1X1);
    const { json, bin } = parseGlb(glb);
    const posAcc = json.accessors.find((a) => a.type === "VEC3" && a.max);
    const uvAcc = json.accessors.find((a) => a.type === "VEC2");
    expect(posAcc && uvAcc).toBeTruthy();
    if (!posAcc || !uvAcc) return;
    const posView = json.bufferViews[posAcc.bufferView];
    const uvView = json.bufferViews[uvAcc.bufferView];
    expect(posView && uvView).toBeTruthy();
    if (!posView || !uvView) return;
    const pos = new Float32Array(
      bin.buffer,
      bin.byteOffset + (posView.byteOffset ?? 0),
      posAcc.count * 3,
    );
    const uvs = new Float32Array(
      bin.buffer,
      bin.byteOffset + (uvView.byteOffset ?? 0),
      uvAcc.count * 2,
    );
    let topV = 0;
    let bottomV = 0;
    let maxY = -Infinity;
    let minY = Infinity;
    for (let i = 0; i < posAcc.count; i += 1) {
      const y = pos[i * 3 + 1]!;
      const v = uvs[i * 2 + 1]!;
      if (y > maxY) {
        maxY = y;
        topV = v;
      }
      if (y < minY) {
        minY = y;
        bottomV = v;
      }
    }
    expect(topV).toBeLessThan(bottomV);
  });
});

function parseGlb(glb: Uint8Array): {
  json: {
    accessors: Array<{
      type: string;
      bufferView: number;
      count: number;
      min?: number[];
      max?: number[];
    }>;
    bufferViews: Array<{ byteOffset?: number }>;
    meshes?: Array<{ primitives?: unknown[] }>;
  };
  bin: Uint8Array;
} {
  const view = new DataView(glb.buffer, glb.byteOffset, glb.byteLength);
  const jsonLen = view.getUint32(12, true);
  const jsonText = new TextDecoder()
    .decode(glb.subarray(20, 20 + jsonLen))
    .trim();
  const json = JSON.parse(jsonText) as ReturnType<typeof parseGlb>["json"];
  const binHeader = 20 + jsonLen;
  const binLen = view.getUint32(binHeader, true);
  const bin = glb.subarray(binHeader + 8, binHeader + 8 + binLen);
  return { json, bin };
}
