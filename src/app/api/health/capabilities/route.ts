import { CAPABILITIES } from "@/lib/capability-router/capabilities";
import { getExecutionPolicies } from "@/lib/capability-router/policies";
import { listCapabilityProviders } from "@/lib/capability-router/register";
import { resolveCapability } from "@/lib/capability-router/resolve";

export const dynamic = "force-dynamic";

export async function GET() {
  const policies = getExecutionPolicies();
  const providers = listCapabilityProviders().map((p) => ({
    id: p.manifest.id,
    name: p.manifest.name,
    status: p.manifest.status,
    enabled: p.manifest.enabled,
    requiresGpu: p.manifest.requiresGpu,
    requiresInternet: p.manifest.requiresInternet,
    capabilities: p.manifest.capabilities,
    priority: p.manifest.priority,
  }));

  const routes = CAPABILITIES.map((capability) => {
    const resolved = resolveCapability(capability, policies);
    return {
      capability,
      resolved: resolved.ok,
      providerId: resolved.ok ? resolved.provider.manifest.id : null,
      reason: resolved.ok ? null : resolved.reason,
    };
  });

  return Response.json({
    ok: true,
    policies,
    providers,
    routes,
    modelsLoaded: false,
  });
}
