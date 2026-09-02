import Link from "next/link";

export function CreditBalanceChip({
  balance,
  compact = false,
}: {
  balance: number;
  compact?: boolean;
}) {
  const label = new Intl.NumberFormat("pt-BR").format(balance);
  const low = balance < 6;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href="/billing"
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
          low
            ? "border-amber-400/30 bg-amber-500/10 text-amber-100 hover:border-amber-300/50"
            : "border-white/10 bg-white/[0.05] text-zinc-200 hover:border-violet-400/30 hover:text-white"
        }`}
        title="Ver saldo e faturas"
      >
        <span className="tabular-nums font-semibold">{label}</span>
        <span className={compact ? "hidden sm:inline" : undefined}>
          {balance === 1 ? "crédito" : "créditos"}
        </span>
      </Link>
      <Link
        href="/billing#planos"
        className="x09-button-primary shrink-0 px-3 py-1.5 text-xs"
      >
        Comprar
      </Link>
    </div>
  );
}
