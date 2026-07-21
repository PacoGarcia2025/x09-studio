export type Property = {
  id: string;
  slug: string;
  title: string;
  type: string;
  neighborhood: string;
  city: string;
  price: number;
  rent?: number;
  bedrooms: number;
  suites: number;
  parking: number;
  area: number;
  tags: string[];
  images: string[];
  description: string;
  iptu?: number;
  condo?: number;
  brokerName: string;
  brokerPhone: string;
  featured: boolean;
};

export const MOCK_PROPERTIES: Property[] = [
  {
    id: "1",
    slug: "cobertura-jardins",
    title: "Cobertura duplex Jardins",
    type: "Cobertura",
    neighborhood: "Jardins",
    city: "São Paulo",
    price: 12_800_000,
    bedrooms: 4,
    suites: 3,
    parking: 4,
    area: 420,
    tags: ["Penthouse", "Exclusividade", "Pé direito duplo"],
    images: [
      "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200",
    ],
    description: "Cobertura de alto padrão com vista panorâmica.",
    iptu: 4200,
    condo: 6800,
    brokerName: "Ana Corretora",
    brokerPhone: "5511999999999",
    featured: true,
  },
];

export function getPropertyById(id: string): Property | undefined {
  return MOCK_PROPERTIES.find((p) => p.id === id);
}

export function formatPriceBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
