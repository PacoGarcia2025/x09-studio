import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { GenerateStudio } from "@/components/assets/GenerateStudio";
import { assetsRootConfigured } from "@/lib/assets/paths";
import { isCommercialMeshConfigured } from "@/lib/capability-router/providers/meshy-env";
import { getExecutionPolicies } from "@/lib/capability-router/policies";

export const dynamic = "force-dynamic";
export const maxDuration = 1800;

export default async function AssetsPage() {
  const diskReady = assetsRootConfigured();
  const policies = getExecutionPolicies();
  const commercialMesh =
    policies.paidApisAllowed && isCommercialMeshConfigured();

  return (
    <AppShell activeHref="/assets">
      <div className="space-y-6 px-4 py-5 sm:space-y-8 sm:px-5 sm:py-8 md:px-8">
        <section className="x09-card overflow-hidden rounded-[1.5rem] p-5 sm:rounded-[2rem] sm:p-8">
          <p className="text-xs uppercase tracking-[0.28em] text-violet-300">
            3D
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
            Criar objeto 3D
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400">
            Envie uma foto ou descreva o que quer. O arquivo vai para a{" "}
            <Link href="/biblioteca" className="text-violet-200 underline-offset-4 hover:underline">
              Biblioteca
            </Link>
            . Depois de gerar, visualize, baixe ou comece outro.
          </p>
        </section>

        {!diskReady ? (
          <p className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            O armazenamento de arquivos ainda não está ligado neste servidor.
          </p>
        ) : null}

        <GenerateStudio commercialMesh={commercialMesh} />
      </div>
    </AppShell>
  );
}
