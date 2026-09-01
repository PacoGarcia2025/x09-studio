import { listCapabilityProviders } from "@/lib/capability-router/register";
import type { AiAssetProvider } from "@/lib/ai-engine/types";

function toCatalog(item: ReturnType<typeof listCapabilityProviders>[number]): AiAssetProvider {
  const m = item.manifest;
  return {
    id: m.id,
    label: m.name,
    capabilities: m.capabilities,
    requiresGpu: m.requiresGpu,
    status: m.status,
  };
}

/** Catálogo público = providers do Router. Sem nomes de motores. */
export function listAiAssetProviders(): AiAssetProvider[] {
  return listCapabilityProviders().map(toCatalog);
}

export function getAiAssetProvider(id?: string): AiAssetProvider {
  const list = listAiAssetProviders();
  if (id) {
    const match = list.find((p) => p.id === id);
    if (match) return match;
  }
  const local = list.find((p) => p.id === "local-assets") ?? list[0];
  if (!local) {
    throw new Error("Nenhum capability provider registrado");
  }
  return local;
}
