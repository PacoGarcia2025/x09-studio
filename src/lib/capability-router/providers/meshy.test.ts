import { describe, expect, it, beforeEach } from "vitest";
import { createExecutionContext } from "@/lib/capability-router/context";
import { createLocalCapabilityProvider } from "@/lib/capability-router/providers/local";
import { createMeshyProvider } from "@/lib/capability-router/providers/meshy";
import { meshyCreateBodyForTier, normalizeMeshyTask, pickAnimationGlbUrl, pickRiggedGlbUrl } from "@/lib/capability-router/providers/meshy-api";
import { buildFakeMeshGlb, isGlbMagic } from "@/lib/capability-router/providers/fake-mesh-glb";
import { resetCapabilityProvidersForTests } from "@/lib/capability-router/register";
import {
  listCapabilityCandidates,
  resolveCapability,
} from "@/lib/capability-router";
import type { AssetJobRow } from "@/lib/asset-jobs/types";
import type { AssetStorageDriver } from "@/lib/storage/types";
import type { MeshyHttp } from "@/lib/capability-router/providers/meshy-api";

const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

const policiesPaid = {
  generationEnabled: true,
  paidApisAllowed: true,
  gpuAvailable: false,
  internetAllowed: true,
};

function job(overrides: Partial<AssetJobRow> = {}): AssetJobRow {
  return {
    id: "j-com",
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
    meta: { capability: "mesh.generate", meshTier: "game" },
    credits_reserved: 18,
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

describe("commercial mesh provider", () => {
  beforeEach(() => {
    resetCapabilityProvidersForTests([
      createLocalCapabilityProvider(),
      createMeshyProvider({ apiKey: "test-key" }),
    ]);
  });

  it("o vocabulário público não cita o motor comercial", () => {
    expect(createMeshyProvider().manifest.id).toBe("commercial-mesh");
    expect(createMeshyProvider().manifest.requiresPaidApi).toBe(true);
  });

  it("monta o pedido game com topologia para jogo e textura", () => {
    const body = meshyCreateBodyForTier("game", "data:image/png;base64,xx");
    expect(body.model_type).toBe("smart-topology");
    expect(body.should_texture).toBe(true);
    expect(body.ai_model).toMatch(/t2/i);
    expect(body.pose_mode).toBeUndefined();
    expect(meshyCreateBodyForTier("game", "data:image/png;base64,xx", "t-pose").pose_mode).toBe(
      "t-pose",
    );
  });

  it("só entra na lista quando paidApisAllowed", () => {
    const off = listCapabilityCandidates("mesh.generate", {
      ...policiesPaid,
      paidApisAllowed: false,
    });
    expect(off.map((p) => p.manifest.id)).not.toContain("commercial-mesh");
    const on = listCapabilityCandidates("mesh.generate", policiesPaid);
    expect(on[0]?.manifest.id).toBe("commercial-mesh");
  });

  it("resolve mesh.generate para commercial-mesh sem GPU", () => {
    const result = resolveCapability("mesh.generate", policiesPaid);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.provider.manifest.id).toBe("commercial-mesh");
    }
  });

  it("ignora jobs GPU/local", async () => {
    const files = new Map<string, Uint8Array>([
      ["w1/image/src/source.png", PNG_1X1],
    ]);
    const ctx = createExecutionContext({
      job: job({ meta: { capability: "mesh.generate", meshTier: "gpu" } }),
      capability: "mesh.generate",
      storage: memoryStorage(files),
      policies: policiesPaid,
    });
    const result = await createMeshyProvider({ apiKey: "k" }).execute(ctx);
    expect(result.status).toBe("skipped");
  });

  it("grava o GLB devolvido pela API", async () => {
    const glb = buildFakeMeshGlb();
    const http: MeshyHttp = async (input, init) => {
      const url = String(input);
      if (init?.method === "POST") {
        return new Response(JSON.stringify({ result: "task-1" }), { status: 200 });
      }
      if (url.endsWith("/image-to-3d/task-1")) {
        return new Response(
          JSON.stringify({
            id: "task-1",
            status: "SUCCEEDED",
            model_urls: { glb: "https://cdn.example/model.glb" },
            consumed_credits: 15,
          }),
          { status: 200 },
        );
      }
      if (url.includes("cdn.example")) {
        return new Response(glb, { status: 200 });
      }
      return new Response("nope", { status: 404 });
    };

    const files = new Map<string, Uint8Array>([
      ["w1/image/src/source.png", PNG_1X1],
    ]);
    const ctx = createExecutionContext({
      job: job(),
      capability: "mesh.generate",
      storage: memoryStorage(files),
      policies: policiesPaid,
    });
    const result = await createMeshyProvider({
      http,
      apiKey: "k",
      timeoutMs: 5_000,
    }).execute(ctx);
    expect(result.status).toBe("done");
    expect(result.meta?.meshTier).toBe("game");
    expect(isGlbMagic(files.get("w1/mesh/a1/source.glb")!)).toBe(true);
  });

  it("devolve waiting quando a API ainda está a gerar", async () => {
    const http: MeshyHttp = async (input, init) => {
      const url = String(input);
      if (init?.method === "POST") {
        return new Response(JSON.stringify({ result: "task-1" }), { status: 200 });
      }
      if (url.endsWith("/image-to-3d/task-1")) {
        return new Response(
          JSON.stringify({
            id: "task-1",
            status: "IN_PROGRESS",
            progress: 40,
          }),
          { status: 200 },
        );
      }
      return new Response("nope", { status: 404 });
    };
    const files = new Map<string, Uint8Array>([
      ["w1/image/src/source.png", PNG_1X1],
    ]);
    const ctx = createExecutionContext({
      job: job(),
      capability: "mesh.generate",
      storage: memoryStorage(files),
      policies: policiesPaid,
    });
    const result = await createMeshyProvider({
      http,
      apiKey: "k",
      timeoutMs: 5_000,
    }).execute(ctx);
    expect(result.status).toBe("waiting");
    expect(result.meta?.commercialTaskId).toBe("task-1");
  });

  it("personagem para jogo cria o esqueleto depois da malha", async () => {
    const http: MeshyHttp = async (input, init) => {
      const url = String(input);
      if (init?.method === "POST" && url.includes("image-to-3d")) {
        return new Response(JSON.stringify({ result: "task-1" }), { status: 200 });
      }
      if (init?.method === "POST" && url.includes("rigging")) {
        return new Response(JSON.stringify({ result: "rig-1" }), { status: 200 });
      }
      if (url.endsWith("/image-to-3d/task-1")) {
        return new Response(
          JSON.stringify({
            id: "task-1",
            status: "SUCCEEDED",
            model_urls: { glb: "https://cdn.example/model.glb" },
          }),
          { status: 200 },
        );
      }
      return new Response("nope", { status: 404 });
    };
    const files = new Map<string, Uint8Array>([
      ["w1/image/src/source.png", PNG_1X1],
    ]);
    const ctx = createExecutionContext({
      job: job({
        meta: {
          capability: "mesh.generate",
          meshTier: "game",
          rigForGame: true,
          poseMode: "t-pose",
        },
      }),
      capability: "mesh.generate",
      storage: memoryStorage(files),
      policies: policiesPaid,
    });
    const result = await createMeshyProvider({
      http,
      apiKey: "k",
      timeoutMs: 5_000,
    }).execute(ctx);
    expect(result.status).toBe("waiting");
    expect(result.meta?.commercialPhase).toBe("rig");
    expect(result.meta?.rigTaskId).toBe("rig-1");
  });

  it("lê o GLB com esqueleto mesmo quando a API aninha o resultado", async () => {
    const nested = normalizeMeshyTask({
      id: "rig-1",
      status: "SUCCEEDED",
      result: {
        rigged_character_glb_url: "https://cdn.example/rigged.glb",
        basic_animations: {
          walking_glb_url: "https://cdn.example/walk.glb",
        },
      },
    });
    expect(pickRiggedGlbUrl(nested)).toBe("https://cdn.example/walk.glb");
    expect(
      pickAnimationGlbUrl(
        normalizeMeshyTask({
          id: "anim-1",
          status: "SUCCEEDED",
          result: { animation_glb_url: "https://cdn.example/idle.glb" },
        }),
      ),
    ).toBe("https://cdn.example/idle.glb");
    expect(
      pickRiggedGlbUrl(
        normalizeMeshyTask({
          id: "rig-2",
          status: "SUCCEEDED",
          result: { rigged_character_glb_url: "https://cdn.example/rigged.glb" },
        }),
      ),
    ).toBe("https://cdn.example/rigged.glb");
  });

  it("texto → 3D faz preview e refine", async () => {
    const glb = buildFakeMeshGlb();
    const http: MeshyHttp = async (input, init) => {
      const url = String(input);
      if (init?.method === "POST" && url.includes("text-to-3d")) {
        const body = JSON.parse(String(init.body ?? "{}")) as { mode?: string };
        const id = body.mode === "refine" ? "ref-1" : "prev-1";
        return new Response(JSON.stringify({ result: id }), { status: 200 });
      }
      if (url.endsWith("/text-to-3d/prev-1") || url.endsWith("/text-to-3d/ref-1")) {
        return new Response(
          JSON.stringify({
            id: url.includes("ref-1") ? "ref-1" : "prev-1",
            status: "SUCCEEDED",
            model_urls: { glb: "https://cdn.example/model.glb" },
          }),
          { status: 200 },
        );
      }
      if (url.includes("cdn.example")) {
        return new Response(glb, { status: 200 });
      }
      return new Response("nope", { status: 404 });
    };
    const files = new Map<string, Uint8Array>();
    const ctx = createExecutionContext({
      job: job({
        input_path: null,
        meta: {
          capability: "mesh.generate",
          meshTier: "game",
          prompt: "carro vermelho",
        },
      }),
      capability: "mesh.generate",
      storage: memoryStorage(files),
      policies: policiesPaid,
    });
    const result = await createMeshyProvider({
      http,
      apiKey: "k",
      timeoutMs: 5_000,
    }).execute(ctx);
    expect(result.status).toBe("done");
    expect(result.meta?.sourceMode).toBe("text");
    expect(isGlbMagic(files.get("w1/mesh/a1/source.glb")!)).toBe(true);
  });

  it("depois do esqueleto começa o idle", async () => {
    const glb = buildFakeMeshGlb();
    const posted: unknown[] = [];
    const http: MeshyHttp = async (input, init) => {
      const url = String(input);
      if (init?.method === "POST" && url.includes("/animations")) {
        posted.push(JSON.parse(String(init.body ?? "{}")));
        return new Response(JSON.stringify({ result: "anim-idle" }), {
          status: 200,
        });
      }
      if (url.endsWith("/rigging/rig-1")) {
        return new Response(
          JSON.stringify({
            id: "rig-1",
            status: "SUCCEEDED",
            result: {
              rigged_character_glb_url: "https://cdn.example/rigged.glb",
              basic_animations: {
                walking_glb_url: "https://cdn.example/walk.glb",
              },
            },
          }),
          { status: 200 },
        );
      }
      if (url.includes("cdn.example")) {
        return new Response(glb, { status: 200 });
      }
      return new Response("nope", { status: 404 });
    };
    const files = new Map<string, Uint8Array>();
    const ctx = createExecutionContext({
      job: job({
        meta: {
          capability: "mesh.generate",
          meshTier: "game",
          rigForGame: true,
          commercialPhase: "rig",
          rigTaskId: "rig-1",
        },
      }),
      capability: "mesh.generate",
      storage: memoryStorage(files),
      policies: policiesPaid,
    });
    const result = await createMeshyProvider({
      http,
      apiKey: "k",
      timeoutMs: 5_000,
    }).execute(ctx);
    expect(result.status).toBe("waiting");
    expect(result.meta?.commercialPhase).toBe("animate");
    expect(result.meta?.clipTaskId).toBe("anim-idle");
    expect(result.meta?.hasWalk).toBe(true);
    expect(posted).toEqual([{ rig_task_id: "rig-1", action_id: 0 }]);
    expect(isGlbMagic(files.get("w1/mesh/a1/source.glb")!)).toBe(true);
  });

  it("grava idle e passa ao ataque", async () => {
    const glb = buildFakeMeshGlb();
    const posted: unknown[] = [];
    const http: MeshyHttp = async (input, init) => {
      const url = String(input);
      if (init?.method === "POST" && url.includes("/animations")) {
        posted.push(JSON.parse(String(init.body ?? "{}")));
        return new Response(JSON.stringify({ result: "anim-attack" }), {
          status: 200,
        });
      }
      if (url.endsWith("/animations/anim-idle")) {
        return new Response(
          JSON.stringify({
            id: "anim-idle",
            status: "SUCCEEDED",
            result: { animation_glb_url: "https://cdn.example/idle.glb" },
          }),
          { status: 200 },
        );
      }
      if (url.includes("cdn.example")) {
        return new Response(glb, { status: 200 });
      }
      return new Response("nope", { status: 404 });
    };
    const files = new Map<string, Uint8Array>();
    const ctx = createExecutionContext({
      job: job({
        meta: {
          capability: "mesh.generate",
          meshTier: "game",
          rigForGame: true,
          commercialPhase: "animate",
          rigTaskId: "rig-1",
          clipIndex: 0,
          clipTaskId: "anim-idle",
          hasWalk: true,
        },
      }),
      capability: "mesh.generate",
      storage: memoryStorage(files),
      policies: policiesPaid,
    });
    const result = await createMeshyProvider({
      http,
      apiKey: "k",
      timeoutMs: 5_000,
    }).execute(ctx);
    expect(result.status).toBe("waiting");
    expect(result.meta?.clipTaskId).toBe("anim-attack");
    expect(result.meta?.hasIdle).toBe(true);
    expect(posted).toEqual([{ rig_task_id: "rig-1", action_id: 4 }]);
    expect(isGlbMagic(files.get("w1/mesh/a1/idle.glb")!)).toBe(true);
  });

  it("se o idle/ataque falharem, o personagem fica com o passo", async () => {
    const http: MeshyHttp = async (input, init) => {
      const url = String(input);
      if (init?.method === "POST" && url.includes("/animations")) {
        return new Response("fail", { status: 500 });
      }
      return new Response("nope", { status: 404 });
    };
    const files = new Map<string, Uint8Array>();
    const ctx = createExecutionContext({
      job: job({
        meta: {
          capability: "mesh.generate",
          meshTier: "game",
          rigForGame: true,
          commercialPhase: "animate",
          rigTaskId: "rig-1",
          hasWalk: true,
        },
        output_path: "w1/mesh/a1/source.glb",
      }),
      capability: "mesh.generate",
      storage: memoryStorage(files),
      policies: policiesPaid,
    });
    const result = await createMeshyProvider({
      http,
      apiKey: "k",
      timeoutMs: 5_000,
    }).execute(ctx);
    expect(result.status).toBe("done");
    expect(result.meta?.rigged).toBe(true);
    expect(result.meta?.hasWalk).toBe(true);
    expect(result.meta?.hasIdle).toBe(false);
    expect(result.meta?.hasAttack).toBe(false);
  });

  it("retextura grava um GLB novo", async () => {
    const glb = buildFakeMeshGlb();
    const http: MeshyHttp = async (input, init) => {
      const url = String(input);
      if (init?.method === "POST" && url.includes("retexture")) {
        return new Response(JSON.stringify({ result: "ret-1" }), { status: 200 });
      }
      if (url.endsWith("/retexture/ret-1")) {
        return new Response(
          JSON.stringify({
            id: "ret-1",
            status: "SUCCEEDED",
            model_urls: { glb: "https://cdn.example/model.glb" },
          }),
          { status: 200 },
        );
      }
      if (url.includes("cdn.example")) {
        return new Response(glb, { status: 200 });
      }
      return new Response("nope", { status: 404 });
    };
    const files = new Map<string, Uint8Array>([
      ["w1/mesh/src/source.glb", glb],
    ]);
    const ctx = createExecutionContext({
      job: job({
        input_path: "w1/mesh/src/source.glb",
        output_path: "w1/mesh/a1/source.glb",
        meta: {
          capability: "texture.generate",
          prompt: "metal azul",
        },
      }),
      capability: "texture.generate",
      storage: memoryStorage(files),
      policies: policiesPaid,
    });
    const result = await createMeshyProvider({
      http,
      apiKey: "k",
      timeoutMs: 5_000,
    }).execute(ctx);
    expect(result.status).toBe("done");
    expect(result.meta?.sourceMode).toBe("retexture");
    expect(isGlbMagic(files.get("w1/mesh/a1/source.glb")!)).toBe(true);
  });
});
