import { getPropertyById, formatPriceBRL } from "../lib/properties";

type Props = {
  propertyId: string;
  onNavigateBack?: () => void;
  onNavigateListings?: () => void;
};

export function PropertyDetailPage({
  propertyId,
  onNavigateBack,
  onNavigateListings,
}: Props) {
  const property = getPropertyById(propertyId);

  if (!property) {
    return (
      <div className="p-8 text-center">
        <p>Imóvel não encontrado.</p>
        <button type="button" onClick={() => onNavigateListings?.()} className="mt-4 text-[#D4AF37]">
          Ver catálogo
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <header className="border-b bg-white px-6 py-4">
        <button type="button" onClick={() => onNavigateBack?.()} className="text-sm text-stone-600">
          ← Voltar
        </button>
      </header>
      <main className="mx-auto max-w-5xl p-6">
        <h1 className="font-serif text-3xl font-semibold">{property.title}</h1>
        <p className="mt-2 text-2xl font-semibold text-[#D4AF37]">
          {formatPriceBRL(property.price)}
        </p>
        <p className="mt-4 text-stone-600">{property.description}</p>
        <a
          href={`https://wa.me/${property.brokerPhone}`}
          className="mt-6 inline-block rounded-full bg-[#D4AF37] px-6 py-3 text-sm font-semibold text-white"
        >
          WhatsApp corretor
        </a>
      </main>
    </div>
  );
}
