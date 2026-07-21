import { useMemo, useState } from "react";
import { PropertyMap } from "../components/PropertyMap";
import {
  MOCK_PROPERTIES,
  formatPriceBRL,
  type Property,
} from "../lib/properties";
import { type LatLngBounds } from "../lib/map-utils";

type Props = {
  onNavigateHome?: () => void;
  onSelectProperty?: (id: string) => void;
};

type SortKey = "price-asc" | "price-desc" | "recent";

function sortProperties(list: Property[], sort: SortKey): Property[] {
  const copy = [...list];
  if (sort === "price-asc") return copy.sort((a, b) => a.price - b.price);
  if (sort === "price-desc") return copy.sort((a, b) => b.price - a.price);
  return copy;
}

export function ListingsPage({ onNavigateHome, onSelectProperty }: Props) {
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [boundsFilter, setBoundsFilter] = useState<string[] | null>(null);
  const [sort, setSort] = useState<SortKey>("price-desc");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    let list = MOCK_PROPERTIES;
    if (typeFilter !== "all") {
      list = list.filter((p) => p.type.toLowerCase().includes(typeFilter));
    }
    if (boundsFilter) {
      list = list.filter((p) => boundsFilter.includes(p.id));
    }
    return sortProperties(list, sort);
  }, [boundsFilter, sort, typeFilter]);

  function handleBoundsChange(_bounds: LatLngBounds, visibleIds: string[]) {
    setBoundsFilter(visibleIds.length ? visibleIds : null);
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-stone-900">
      <header className="border-b border-stone-200 bg-white px-6 py-4">
        <button
          type="button"
          onClick={() => onNavigateHome?.()}
          className="text-sm text-stone-600 focus-visible:outline focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
        >
          ← Voltar
        </button>
        <h1 className="mt-2 font-serif text-2xl font-semibold">Catálogo premium</h1>
      </header>

      <main className="mx-auto grid max-w-7xl gap-4 p-4 lg:grid-cols-2 lg:p-6">
        <aside className="space-y-4 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
          <div className="flex flex-wrap gap-2">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-sm"
              aria-label="Ordenação"
            >
              <option value="price-desc">Maior preço</option>
              <option value="price-asc">Menor preço</option>
              <option value="recent">Mais recentes</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-sm"
              aria-label="Tipo de imóvel"
            >
              <option value="all">Todos os tipos</option>
              <option value="cobertura">Cobertura</option>
              <option value="apartamento">Apartamento</option>
              <option value="casa">Casa</option>
            </select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                onMouseEnter={() => setHighlightedId(p.id)}
                onMouseLeave={() => setHighlightedId(null)}
                onClick={() => onSelectProperty?.(p.id)}
                className={`rounded-2xl bg-white p-4 text-left ring-1 transition-all ${
                  highlightedId === p.id
                    ? "ring-2 ring-[#D4AF37] shadow-lg"
                    : "ring-stone-200 hover:ring-[#D4AF37]/40"
                }`}
              >
                <img
                  src={p.images[0]}
                  alt={p.title}
                  loading="lazy"
                  decoding="async"
                  className="mb-3 h-36 w-full rounded-xl object-cover"
                />
                <p className="font-medium">{p.title}</p>
                <p className="text-sm text-stone-500">
                  {p.neighborhood}, {p.city}
                </p>
                <p className="mt-2 font-semibold text-[#D4AF37]">
                  {formatPriceBRL(p.price)}
                </p>
              </button>
            ))}
          </div>
        </aside>

        <div className="sticky top-4 h-[min(70vh,640px)]">
          <PropertyMap
            properties={MOCK_PROPERTIES}
            highlightedId={highlightedId}
            onHighlight={setHighlightedId}
            onBoundsChange={handleBoundsChange}
            onSelect={(id) => onSelectProperty?.(id)}
          />
          <p className="mt-2 text-xs text-stone-500">
            Mova o mapa para filtrar imóveis visíveis na região.
          </p>
        </div>
      </main>
    </div>
  );
}
