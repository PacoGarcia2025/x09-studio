import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { AssetLibraryList } from "@/components/assets/AssetLibraryList";
import { AssetUploadForm } from "@/components/assets/AssetUploadForm";
import { listLibraryAssets } from "@/lib/assets/actions";

export const dynamic = "force-dynamic";

export default async function BibliotecaPage() {
  const library = await listLibraryAssets();

  return (
    <AppShell activeHref="/biblioteca">
      <div className="space-y-6 px-4 py-5 sm:space-y-8 sm:px-5 sm:py-8 md:px-8">
        <section className="x09-card overflow-hidden rounded-[1.5rem] p-5 sm:rounded-[2rem] sm:p-8">
          <p className="text-xs uppercase tracking-[0.28em] text-violet-300">
            Biblioteca
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
            Seus arquivos
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400">
            Fotos e objetos 3D guardados. Para criar um GLB novo, use a página{" "}
            <Link
              href="/assets"
              className="text-violet-200 underline-offset-4 hover:underline"
            >
              3D
            </Link>
            .
          </p>
        </section>

        {!library.ok ? (
          <p className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {library.error}
          </p>
        ) : null}

        {library.ok && !library.schemaReady ? (
          <p className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            {library.error}
          </p>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,320px)_1fr]">
          <section className="x09-card h-fit rounded-[1.75rem] p-6">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
              Enviar
            </p>
            <h2 className="mt-2 text-lg font-semibold text-white">
              Arquivo avulso
            </h2>
            <p className="mt-1 mb-5 text-sm text-zinc-500">
              Foto, logo ou GLB que você já tem no computador.
            </p>
            <AssetUploadForm />
          </section>

          <section className="x09-card rounded-[1.75rem] p-6">
            {library.ok && library.schemaReady ? (
              <AssetLibraryList assets={library.assets} />
            ) : (
              <p className="text-sm text-zinc-500">
                A lista aparece quando a biblioteca estiver ligada.
              </p>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
