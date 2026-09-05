import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ProfilePanel } from "@/components/profile/ProfilePanel";
import { loadCurrentProfile } from "@/lib/profile/load";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const loaded = await loadCurrentProfile();
  if (!loaded.ok) redirect("/login?next=/perfil");

  const firstName =
    loaded.data.profile.fullName.split(/\s+/)[0] ||
    loaded.data.email.split("@")[0] ||
    "criador";

  return (
    <AppShell
      workspaceName={`Studio do ${firstName}`}
      avatarLabel={firstName.charAt(0).toUpperCase()}
      activeHref="/perfil"
    >
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-5 sm:px-5 sm:py-8 md:px-8">
        <section>
          <p className="text-xs uppercase tracking-[0.28em] text-violet-300">
            Conta
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
            Meu perfil
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-7 text-zinc-400">
            Os seus dados, uma foto ou logo, e a senha da conta.
          </p>
        </section>
        <ProfilePanel
          email={loaded.data.email}
          profile={loaded.data.profile}
          avatarUrl={loaded.data.avatarUrl}
          schemaReady={loaded.data.schemaReady}
        />
      </div>
    </AppShell>
  );
}
