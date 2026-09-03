import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { startPlanCheckout } from "@/lib/billing/checkout.actions";
import {
  BUILD_CREDIT_COST,
  CREDIT_PACKAGES,
  SIGNUP_BONUS_CREDITS,
  TEXT_TO_3D_CREDIT_COST,
  formatPackagePriceLabel,
  studioSupportEmail,
} from "@/lib/billing/product";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function BillingPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string; error?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const supportEmail = studioSupportEmail();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const displayName =
    (user?.user_metadata?.full_name as string | undefined)?.trim() ||
    user?.email?.split("@")[0] ||
    "criador";
  const firstName = displayName.split(/\s+/)[0] || "criador";

  let balance = 0;
  if (user) {
    const { data: wallet } = await supabase
      .from("credit_wallets")
      .select("balance")
      .eq("user_id", user.id)
      .maybeSingle();
    balance = wallet?.balance ?? 0;
  }

  return (
    <AppShell
      workspaceName={`Studio do ${firstName}`}
      avatarLabel={firstName.charAt(0).toUpperCase()}
      activeHref="/billing"
    >
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-5 sm:py-10 md:px-8">
        <div className="mb-8">
          <Link
            href="/projects"
            className="text-sm font-medium text-zinc-500 transition hover:text-violet-200"
          >
            ← Voltar ao painel
          </Link>
          <p className="mt-4 text-xs font-bold uppercase tracking-[0.24em] text-violet-300">
            Assinatura
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-white md:text-4xl">
            Planos e créditos
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
            Cada site consome {BUILD_CREDIT_COST} créditos de Build. Texto → 3D
            comercial usa {TEXT_TO_3D_CREDIT_COST} créditos. Conta nova recebe{" "}
            {SIGNUP_BONUS_CREDITS} créditos de boas-vindas. Pague com Mercado
            Pago. Seu saldo atual:{" "}
            <span className="font-semibold text-violet-200">
              {balance} créditos
            </span>
            .
          </p>
          {params.status === "return" ? (
            <p className="mt-3 rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
              Pagamento retornado. Se aprovado, os créditos entram em instantes.
            </p>
          ) : null}
          {params.error === "mp" || params.error === "checkout" ? (
            <p className="mt-3 rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
              Não foi possível iniciar o pagamento. Confira se o Mercado Pago
              está ligado neste ambiente ou escreva para {supportEmail}.
            </p>
          ) : null}
        </div>

        <div id="planos" className="grid scroll-mt-24 gap-5 md:grid-cols-2 xl:grid-cols-4">
          {CREDIT_PACKAGES.map((plan) => (
            <article
              key={plan.code}
              className={`x09-card rounded-[28px] p-6 ${
                plan.highlighted ? "ring-1 ring-violet-400/40" : ""
              }`}
            >
              {plan.highlighted ? (
                <span className="mb-3 inline-flex rounded-full bg-violet-500/20 px-2.5 py-1 text-[11px] font-semibold text-violet-100 ring-1 ring-violet-400/30">
                  Mais popular
                </span>
              ) : (
                <span className="mb-3 inline-block h-6" />
              )}
              <h2 className="text-xl font-semibold text-white">{plan.name}</h2>
              <p className="mt-1 text-sm text-zinc-400">{plan.blurb}</p>
              <p className="mt-5 text-4xl font-bold tracking-tight text-white">
                {formatPackagePriceLabel(plan.amountCents)}
                <span className="text-base font-medium text-zinc-500">
                  {" "}
                  / pacote
                </span>
              </p>
              <p className="mt-1 text-sm font-medium text-violet-200">
                {plan.credits} créditos
              </p>

              <ul className="mt-5 space-y-2 text-sm text-zinc-400">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <span className="text-violet-300">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>

              <form action={startPlanCheckout} className="mt-6">
                <input type="hidden" name="planCode" value={plan.code} />
                <button
                  type="submit"
                  className={
                    plan.highlighted
                      ? "x09-button-primary w-full px-4 py-3 text-sm"
                      : "x09-button-secondary w-full px-4 py-3 text-sm"
                  }
                >
                  Comprar {plan.name}
                </button>
              </form>
            </article>
          ))}
        </div>

        <aside className="mt-10 rounded-[28px] border border-white/10 bg-white/[0.03] p-6 text-sm leading-6 text-zinc-400">
          <h2 className="text-base font-semibold text-white">
            Suporte e reembolso
          </h2>
          <p className="mt-2">
            Dúvidas de fatura, falha no pagamento ou créditos que não
            aparecerem:{" "}
            <a
              href={`mailto:${supportEmail}`}
              className="text-violet-200 underline-offset-4 hover:underline"
            >
              {supportEmail}
            </a>
            . Resposta em horário comercial (Brasília).
          </p>
          <p className="mt-2">
            Créditos não usados podem ser reembolsados até 7 dias após a
            compra, se nenhuma geração tiver sido debitada nesse pacote. Depois
            do consumo, o valor correspondente não volta. Job que falha na
            geração devolve os créditos automaticamente.
          </p>
        </aside>
      </div>
    </AppShell>
  );
}
