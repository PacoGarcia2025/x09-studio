import { describe, expect, it, beforeEach } from "vitest";
import {
  CAPABILITIES,
  resolveCapability,
  registerCapabilityProvider,
  listCapabilityProviders,
} from "@/lib/capability-router";
import { resetCapabilityProvidersForTests } from "@/lib/capability-router/register";
import { createLocalCapabilityProvider } from "@/lib/capability-router/providers/local";
import { createExecutionContext } from "@/lib/capability-router/context";
import type { CapabilityProvider } from "@/lib/capability-router/types";
import type { AssetJobRow } from "@/lib/asset-jobs/types";
import { capabilityFromKindOperation } from "@/lib/capability-router/from-job";

const policies = {
  generationEnabled: false,
  paidApisAllowed: false,
  gpuAvailable: false,
  internetAllowed: true,
};

function gpuMeshProvider(): CapabilityProvider {
  return {
    manifest: {
      id: "test-gpu-mesh",
      name: "Test GPU",
      version: "0",
      capabilities: ["mesh.generate"],
      priority: 50,
      status: "ready",
      requiresGpu: true,
      requiresInternet: false,
      enabled: true,
    },
    async execute() {
      return { status: "failed", message: "não deve executar sem GPU" };
    },
  };
}

describe("Capability Router", () => {
  beforeEach(() => {
    resetCapabilityProvidersForTests([createLocalCapabilityProvider()]);
  });

  it("expõe o vocabulário sem nomes de motores", () => {
    expect(CAPABILITIES).toContain("mesh.generate");
    expect(CAPABILITIES.join(" ")).not.toMatch(/trellis|hunyuan|triposr|flux/i);
  });

  it("resolve asset.ingest para o provider local", () => {
    const result = resolveCapability("asset.ingest", policies);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.provider.manifest.id).toBe("local-assets");
    }
  });

  it("não resolve mesh.generate sem provider registrado", () => {
    const result = resolveCapability("mesh.generate", {
      ...policies,
      generationEnabled: true,
    });
    expect(result.ok).toBe(false);
  });

  it("ignora provider GPU quando gpuAvailable=false", () => {
    registerCapabilityProvider(gpuMeshProvider());
    const result = resolveCapability("mesh.generate", {
      ...policies,
      generationEnabled: true,
      gpuAvailable: false,
    });
    expect(result.ok).toBe(false);
  });

  it("escolhe o provider de maior prioridade quando GPU existe", () => {
    registerCapabilityProvider(gpuMeshProvider());
    const result = resolveCapability("mesh.generate", {
      ...policies,
      generationEnabled: true,
      gpuAvailable: true,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.provider.manifest.id).toBe("test-gpu-mesh");
    }
  });

  it("bloqueia generate quando generationEnabled=false mesmo com provider", () => {
    registerCapabilityProvider(gpuMeshProvider());
    const result = resolveCapability("mesh.generate", {
      ...policies,
      generationEnabled: false,
      gpuAvailable: true,
    });
    expect(result.ok).toBe(false);
  });

  it("mapeia kind+operation para capability", () => {
    expect(capabilityFromKindOperation("image", "ingest")).toBe("asset.ingest");
    expect(capabilityFromKindOperation("mesh", "generate")).toBe(
      "mesh.generate",
    );
  });

  it("ExecutionContext não expõe o restante do Studio", async () => {
    const provider = createLocalCapabilityProvider();
    const job: AssetJobRow = {
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
    };
    const files = new Set(["w1/image/a1/source.png"]);
    const ctx = createExecutionContext({
      job,
      capability: "asset.ingest",
      storage: {
        id: "local",
        status: "ready",
        writeFile: async () => undefined,
        readFile: async () => Buffer.from(""),
        exists: async (p) => files.has(p),
        remove: async () => undefined,
      },
      policies,
    });
    expect(ctx.workspaceId).toBe("w1");
    expect("supabase" in ctx).toBe(false);
    const result = await provider.execute(ctx);
    expect(result.status).toBe("done");
  });

  it("novos providers entram só com register()", () => {
    const before = listCapabilityProviders().length;
    registerCapabilityProvider(gpuMeshProvider());
    expect(listCapabilityProviders().length).toBe(before + 1);
  });
});
