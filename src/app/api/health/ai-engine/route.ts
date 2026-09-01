import {
  getAiAssetProvider,
  getAiEngineWorkerUrl,
  hasAiEngineWorkerSecret,
  isAiGenerationEnabled,
  listAiAssetProviders,
} from "@/lib/ai-engine";

export const dynamic = "force-dynamic";

/**
 * Health do AI Engine — só configuração. Não chama worker nem baixa modelos.
 */
export async function GET() {
  const provider = getAiAssetProvider();
  const generationEnabled = isAiGenerationEnabled();

  return Response.json({
    ok: true,
    generationEnabled,
    provider: {
      id: provider.id,
      label: provider.label,
      status: provider.status,
      requiresGpu: provider.requiresGpu,
      capabilities: provider.capabilities,
    },
    worker: {
      urlConfigured: Boolean(getAiEngineWorkerUrl()),
      secretConfigured: hasAiEngineWorkerSecret(),
    },
    providers: listAiAssetProviders().map((item) => ({
      id: item.id,
      status: item.status,
      requiresGpu: item.requiresGpu,
    })),
  });
}
