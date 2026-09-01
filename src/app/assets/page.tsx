import { AppShell } from "@/components/AppShell";
import { AssetLibraryList } from "@/components/assets/AssetLibraryList";
import { AssetQueueControls } from "@/components/assets/AssetQueueControls";
import { AssetUploadForm } from "@/components/assets/AssetUploadForm";
import { StubMeshGenerateControls } from "@/components/assets/StubMeshGenerateControls";
import { listLibraryAssets } from "@/lib/assets/actions";
import { assetsRootConfigured } from "@/lib/assets/paths";
import { getAssetProcessor } from "@/lib/asset-jobs/processors/registry";
import { getAssetStorage } from "@/lib/storage/registry";

export const dynamic = "force-dynamic";
export const maxDuration = 1800;

export default async function AssetsPage() {
  const library = await listLibraryAssets();
  const storage = getAssetStorage();
  const processor = getAssetProcessor();
  const diskReady = assetsRootConfigured();

  return (
    <AppShell activeHref="/assets">
      <div className="space-y-8 px-5 py-8 md:px-8">
        <section className="x09-card overflow-hidden rounded-[2rem] p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-4">
              <p className="text-xs uppercase tracking-[0.28em] text-violet-300">
                Biblioteca
              </p>
              <h1 className="text-4xl font-semibold tracking-[-0.04em] text-white md:text-5xl">
                Assets do Studio
              </h1>
              <p className="text-sm leading-7 text-zinc-400">
                Arquivos do workspace, de qualquer origem. A fila processa
                ingestão e generation via Capability Router. O mesh de exemplo
                valida o fluxo completo — ainda sem motor real.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Metric
                label="Itens"
                value={
                  library.ok && library.schemaReady
                    ? String(library.assets.length)
                    : "—"
                }
              />
              <Metric
                label="Storage"
                value={storage.id}
              />
              <Metric
                label="Processor"
                value={processor.id}
              />
            </div>
          </div>
        </section>

        {!diskReady ? (
          <p className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            Defina STUDIO_ASSETS_ROOT ou STUDIO_PROJECTS_ROOT para gravar
            arquivos em disco.
          </p>
        ) : null}

        {library.ok && !library.schemaReady ? (
          <p className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            {library.error}
          </p>
        ) : null}

        {!library.ok ? (
          <p className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {library.error}
          </p>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,380px)_1fr]">
          <section className="x09-card rounded-[1.75rem] p-6">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
              Enviar
            </p>
            <h2 className="mt-2 text-lg font-semibold text-white">
              Novo arquivo
            </h2>
            <p className="mt-1 mb-5 text-sm text-zinc-500">
              Grava na biblioteca e abre um job de ingest (queued). Storage:{" "}
              {storage.id}.
            </p>
            <AssetUploadForm />
            <div className="mt-8 border-t border-white/8 pt-6">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                Validação
              </p>
              <h3 className="mt-2 text-sm font-semibold text-white">
                Mesh de exemplo
              </h3>
              <p className="mt-1 mb-4 text-xs leading-5 text-zinc-500">
                Enfileira mesh.generate. Exige
                STUDIO_AI_ENGINE_GENERATION_ENABLED=true. Sem GPU e sem IA —
                grava um GLB de amostra no tick.
              </p>
              <StubMeshGenerateControls label="Criar mesh de exemplo" />
            </div>
          </section>

          <section className="x09-card rounded-[1.75rem] p-6">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                  Biblioteca
                </p>
                <h2 className="mt-2 text-lg font-semibold text-white">
                  Arquivos do workspace
                </h2>
              </div>
              <AssetQueueControls />
            </div>
            {library.ok && library.schemaReady ? (
              <AssetLibraryList assets={library.assets} />
            ) : (
              <p className="text-sm text-zinc-500">
                A lista aparece depois que as migrations forem aplicadas.
              </p>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}
