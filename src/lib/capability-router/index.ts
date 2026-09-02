/**
 * Capability Router — despacha capability → provider.
 * Registry interno; resolveCapability() é a API pública.
 * O restante do Studio não importa providers concretos.
 */

export {
  CAPABILITIES,
  isCapabilityId,
  type CapabilityId,
} from "@/lib/capability-router/capabilities";

export {
  capabilityFromJob,
  capabilityFromKindOperation,
} from "@/lib/capability-router/from-job";

export { createExecutionContext } from "@/lib/capability-router/context";
export { getExecutionPolicies } from "@/lib/capability-router/policies";
export {
  resolveCapability,
  listCapabilityCandidates,
} from "@/lib/capability-router/resolve";
export {
  registerCapabilityProvider,
  listCapabilityProviders,
} from "@/lib/capability-router/register";

export type {
  ProviderManifest,
  ExecutionContext,
  ExecutionPolicies,
  ProviderResult,
  CapabilityProvider,
  ResolveResult,
} from "@/lib/capability-router/types";
