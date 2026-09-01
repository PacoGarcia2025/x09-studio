import type { CapabilityProvider } from "@/lib/capability-router/types";
import { createFakeMeshProvider } from "@/lib/capability-router/providers/fake-mesh";
import { createLocalCapabilityProvider } from "@/lib/capability-router/providers/local";
import { createTrellisProvider } from "@/lib/capability-router/providers/trellis";

const providers: CapabilityProvider[] = [];

let seeded = false;

function seed() {
  if (seeded) return;
  seeded = true;
  registerCapabilityProvider(createLocalCapabilityProvider());
  registerCapabilityProvider(createFakeMeshProvider());
  registerCapabilityProvider(createTrellisProvider());
}

/** Único ponto para plugar um motor. O restante do Studio não importa o arquivo do provider. */
export function registerCapabilityProvider(provider: CapabilityProvider): void {
  const id = provider.manifest.id;
  const idx = providers.findIndex((p) => p.manifest.id === id);
  if (idx >= 0) {
    providers[idx] = provider;
    return;
  }
  providers.push(provider);
}

export function listCapabilityProviders(): CapabilityProvider[] {
  seed();
  return [...providers];
}

export function resetCapabilityProvidersForTests(
  next: CapabilityProvider[] = [],
): void {
  providers.splice(0, providers.length, ...next);
  seeded = true;
}
