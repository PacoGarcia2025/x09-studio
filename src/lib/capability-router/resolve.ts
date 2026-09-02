import type { CapabilityId } from "@/lib/capability-router/capabilities";
import { listCapabilityProviders } from "@/lib/capability-router/register";
import type {
  CapabilityProvider,
  ExecutionPolicies,
  ResolveResult,
} from "@/lib/capability-router/types";

function generationBlocked(
  capability: CapabilityId,
  policies: ExecutionPolicies,
): boolean {
  return (
    capability !== "asset.ingest" &&
    capability.endsWith(".generate") &&
    !policies.generationEnabled
  );
}

/** Candidatos por prioridade. O processor tenta o próximo se o atual devolver skipped. */
export function listCapabilityCandidates(
  capability: CapabilityId,
  policies: ExecutionPolicies,
): CapabilityProvider[] {
  if (generationBlocked(capability, policies)) return [];

  return listCapabilityProviders()
    .filter((p) => p.manifest.enabled)
    .filter((p) => p.manifest.status === "ready")
    .filter((p) => p.manifest.capabilities.includes(capability))
    .filter((p) => !p.manifest.requiresGpu || policies.gpuAvailable)
    .filter((p) => !p.manifest.requiresInternet || policies.internetAllowed)
    .filter((p) => !p.manifest.requiresPaidApi || policies.paidApisAllowed)
    .sort((a, b) => b.manifest.priority - a.manifest.priority);
}

export function resolveCapability(
  capability: CapabilityId,
  policies: ExecutionPolicies,
): ResolveResult {
  const candidates = listCapabilityCandidates(capability, policies);
  const match = candidates[0];
  if (!match) {
    return {
      ok: false,
      reason: generationBlocked(capability, policies)
        ? `Geração desligada para ${capability}`
        : `Nenhum provider habilitado para ${capability}`,
    };
  }

  return { ok: true, provider: match };
}
