import { MOCK_PROPERTIES, formatPriceBRL } from "../lib/properties";

type Props = {
  onNavigateHome?: () => void;
  onSelectProperty?: (id: string) => void;
};

export function ListingsPage({ onNavigateHome, onSelectProperty }: Props) {
  return (
    <div className="min-h-screen bg-[#FAFAFA] text-stone-900">
      <header className="border-b border-stone-200 bg-white px-6 py-4">
        <button type="button" onClick={() => onNavigateHome?.()} className="text-sm text-stone-600">
          ← Voltar
        </button>
        <h1 className="mt-2 text-2xl font-serif font-semibold">Catálogo de imóveis</h1>
      </header>
      <main className="mx-auto grid max-w-6xl gap-4 p-6 md:grid-cols-2">
        {MOCK_PROPERTIES.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelectProperty?.(p.id)}
            className="rounded-2xl bg-white p-4 text-left ring-1 ring-stone-200 hover:ring-[#D4AF37]/40"
          >
            <p className="font-medium">{p.title}</p>
            <p className="text-sm text-stone-500">{p.neighborhood}, {p.city}</p>
            <p className="mt-2 font-semibold text-[#D4AF37]">{formatPriceBRL(p.price)}</p>
          </button>
        ))}
      </main>
    </div>
  );
}
