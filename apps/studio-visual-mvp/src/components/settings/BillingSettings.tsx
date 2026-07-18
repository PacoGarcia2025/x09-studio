import { CreditCard, Loader2, Sparkles, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ApiClientError,
  cancelSubscription,
  fetchBillingMe,
  startCheckout,
  type BillingSnapshot,
} from "@/lib/api-client";
import { cn } from "@/lib/utils";

export function BillingSettings({
  highlightUpgrade = false,
}: {
  highlightUpgrade?: boolean;
}) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [data, setData] = useState<BillingSnapshot | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const snapshot = await fetchBillingMe();
      setData(snapshot);
    } catch (error) {
      setMessage(
        error instanceof ApiClientError
          ? error.message
          : "Falha ao carregar plano.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function handleCheckout(planCode: "basic" | "pro") {
    setBusy(true);
    setMessage(null);
    try {
      const { initPoint } = await startCheckout(planCode);
      window.location.href = initPoint;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha no checkout.");
      setBusy(false);
    }
  }

  async function handleCancel() {
    setBusy(true);
    setMessage(null);
    try {
      await cancelSubscription();
      setMessage("Assinatura cancelada.");
      await refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Falha ao cancelar.",
      );
    } finally {
      setBusy(false);
    }
  }

  const balance = data?.wallet.balance ?? 0;
  const plan = data?.subscription?.plan_code;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-primary">Configurações</h1>
        <p className="mt-1 text-sm text-secondary">
          Saldo, pacotes de créditos e pagamentos Mercado Pago.
        </p>
      </div>

      {highlightUpgrade ? (
        <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          Créditos insuficientes para gerar. Escolha um plano abaixo para
          continuar.
        </div>
      ) : null}

      <section className="glass-card grid gap-4 rounded-3xl p-6 sm:grid-cols-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-secondary">Saldo</p>
          <p className="mt-1 text-3xl font-semibold text-violet-100">
            {loading ? "…" : balance}
          </p>
          <p className="text-xs text-secondary">créditos</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-secondary">Plano</p>
          <p className="mt-1 text-lg font-semibold text-primary">
            {loading
              ? "…"
              : plan
                ? plan === "pro"
                  ? "Pro"
                  : "Básico"
                : "Gratuito"}
          </p>
          <p className="text-xs text-secondary">
            {data?.subscription?.status || "sem assinatura"}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-secondary">Custos</p>
          <p className="mt-1 text-sm text-primary">
            Build: {data?.costs.generation ?? 1} crédito
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {(data?.plans?.length
          ? data.plans
          : [
              {
                code: "basic",
                name: "Básico",
                monthly_credits: 100,
                amount_cents: 4900,
                currency: "BRL",
              },
              {
                code: "pro",
                name: "Pro",
                monthly_credits: 500,
                amount_cents: 14900,
                currency: "BRL",
              },
            ]
        ).map((p) => {
          const code = p.code as "basic" | "pro";
          return (
            <div
              key={p.code}
              className={cn("glass-card rounded-3xl p-6")}
            >
              <div className="mb-4 flex items-center gap-2">
                {code === "pro" ? (
                  <Sparkles className="h-4 w-4 text-fuchsia-300" />
                ) : (
                  <Zap className="h-4 w-4 text-violet-300" />
                )}
                <h3 className="font-semibold text-primary">{p.name}</h3>
              </div>
              <p className="text-3xl font-semibold text-primary">
                R$ {(p.amount_cents / 100).toFixed(0)}
              </p>
              <p className="mt-2 text-sm text-secondary">
                {p.monthly_credits} créditos
              </p>
              <Button
                type="button"
                disabled={busy}
                onClick={() => void handleCheckout(code)}
                className="mt-5 w-full bg-violet-600 text-white hover:bg-violet-700"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard className="h-4 w-4" />
                )}
                Comprar créditos
              </Button>
            </div>
          );
        })}
      </section>

      {data?.subscription ? (
        <Button
          type="button"
          variant="ghost"
          disabled={busy}
          onClick={() => void handleCancel()}
          className="text-red-300 hover:text-red-200"
        >
          Cancelar assinatura
        </Button>
      ) : null}

      {message ? (
        <p className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-secondary">
          {message}
        </p>
      ) : null}
    </div>
  );
}
