import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { startPlanCheckout } from "@/lib/billing/checkout.actions";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const PLANS = [
  {
    code: "basic" as const,
    name: "Básico",
    credits: 100,
    priceLabel: "R$ 49",
    blurb: "Ideal para validar ideias e landing pages.",
    features: [
      "100 créditos de Build",
      "Projetos ilimitados",
      "Preview e histórico",
      "Pagamento via Mercado Pago",
    ],
  },
  {
    code: "pro" as const,
    name: "Pro",
    credits: 500,
    priceLabel: "R$ 149",
    blurb: "Para quem constrói e publica com frequência.",
    features: [
      "500 créditos de Build",
      "Prioridade na fila de IA",
      "GitHub + deploy",
      "Suporte prioritário",
    ],
    highlighted: true,
  },
];

export default async function BillingPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
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
      <div className="mx-auto max-w-5xl px-5 py-10 md:px-8">
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
            Cada Build consome 1 crédito. Escolha um pacote e pague com Mercado
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
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {PLANS.map((plan) => (
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
                {plan.priceLabel}
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
                  Assinar {plan.name}
                </button>
              </form>
            </article>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
