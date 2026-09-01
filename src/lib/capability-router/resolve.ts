import type { CapabilityId } from "@/lib/capability-router/capabilities";
import { listCapabilityProviders } from "@/lib/capability-router/register";
import type {
  ExecutionPolicies,
  ResolveResult,
} from "@/lib/capability-router/types";

export function resolveCapability(
  capability: CapabilityId,
  policies: ExecutionPolicies,
): ResolveResult {
  const candidates = listCapabilityProviders()
    .filter((p) => p.manifest.enabled)
    .filter((p) => p.manifest.status === "ready")
    .filter((p) => p.manifest.capabilities.includes(capability))
    .filter((p) => !p.manifest.requiresGpu || policies.gpuAvailable)
    .filter((p) => !p.manifest.requiresInternet || policies.internetAllowed)
    .sort((a, b) => b.manifest.priority - a.manifest.priority);

  const match = candidates[0];
  if (!match) {
    return {
      ok: false,
      reason: `Nenhum provider habilitado para ${capability}`,
    };
  }

  if (
    capability !== "asset.ingest" &&
    capability.endsWith(".generate") &&
    !policies.generationEnabled
  ) {
    return {
      ok: false,
      reason: `Geração desligada para ${capability}`,
    };
  }

  return { ok: true, provider: match };
}
