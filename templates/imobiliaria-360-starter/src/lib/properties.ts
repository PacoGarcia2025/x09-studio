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
  lat?: number;
  lng?: number;
  orgId?: string;
  tags: string[];
  images: string[];
  description: string;
  iptu?: number;
  condo?: number;
  brokerName: string;
  brokerPhone: string;
  featured: boolean;
};

const ORG = "org-demo-imob";

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
    lat: -23.5675,
    lng: -46.6682,
    orgId: ORG,
    tags: ["Penthouse", "Exclusividade"],
    images: [
      "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200&fm=webp&q=80",
    ],
    description: "Cobertura de alto padrão com vista panorâmica.",
    iptu: 4200,
    condo: 6800,
    brokerName: "Ana Corretora",
    brokerPhone: "5511999999999",
    featured: true,
  },
  {
    id: "2",
    slug: "apto-itaim",
    title: "Apartamento Itaim Bibi",
    type: "Apartamento",
    neighborhood: "Itaim Bibi",
    city: "São Paulo",
    price: 4_200_000,
    bedrooms: 3,
    suites: 2,
    parking: 3,
    area: 185,
    lat: -23.5822,
    lng: -46.6748,
    orgId: ORG,
    tags: ["Design contemporâneo"],
    images: [
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&fm=webp&q=80",
    ],
    description: "Apartamento reformado com acabamento premium.",
    brokerName: "Ana Corretora",
    brokerPhone: "5511999999999",
    featured: true,
  },
  {
    id: "3",
    slug: "casa-alphaville",
    title: "Casa em condomínio Alphaville",
    type: "Casa",
    neighborhood: "Alphaville",
    city: "Barueri",
    price: 6_750_000,
    bedrooms: 5,
    suites: 4,
    parking: 6,
    area: 520,
    lat: -23.485,
    lng: -46.849,
    orgId: ORG,
    tags: ["Condomínio fechado", "Pet friendly"],
    images: [
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&fm=webp&q=80",
    ],
    description: "Residência ampla com área gourmet e piscina.",
    brokerName: "Carlos Broker",
    brokerPhone: "5511988887777",
    featured: false,
  },
  {
    id: "4",
    slug: "penthouse-vila-olimpia",
    title: "Penthouse Vila Olímpia",
    type: "Cobertura",
    neighborhood: "Vila Olímpia",
    city: "São Paulo",
    price: 9_900_000,
    bedrooms: 4,
    suites: 3,
    parking: 5,
    area: 380,
    lat: -23.595,
    lng: -46.686,
    orgId: ORG,
    tags: ["Penthouse", "Vista cidade"],
    images: [
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&fm=webp&q=80",
    ],
    description: "Penthouse com terraço e home theater.",
    brokerName: "Carlos Broker",
    brokerPhone: "5511988887777",
    featured: true,
  },
  {
    id: "5",
    slug: "apto-moema",
    title: "Apartamento Moema",
    type: "Apartamento",
    neighborhood: "Moema",
    city: "São Paulo",
    price: 2_850_000,
    bedrooms: 2,
    suites: 1,
    parking: 2,
    area: 98,
    lat: -23.603,
    lng: -46.662,
    orgId: ORG,
    tags: ["Oportunidade"],
    images: [
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&fm=webp&q=80",
    ],
    description: "Apartamento compacto premium próximo ao metrô.",
    brokerName: "Ana Corretora",
    brokerPhone: "5511999999999",
    featured: false,
  },
  {
    id: "6",
    slug: "casa-guaruja",
    title: "Casa beira-mar Guarujá",
    type: "Casa",
    neighborhood: "Enseada",
    city: "Guarujá",
    price: 8_400_000,
    bedrooms: 4,
    suites: 3,
    parking: 4,
    area: 410,
    lat: -23.993,
    lng: -46.256,
    orgId: ORG,
    tags: ["Frente para o mar"],
    images: [
      "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=1200&fm=webp&q=80",
    ],
    description: "Casa de veraneio com deck e vista mar.",
    brokerName: "Marina Luxury",
    brokerPhone: "5511977776666",
    featured: true,
  },
];

export function getPropertyById(id: string): Property | undefined {
  return MOCK_PROPERTIES.find((p) => p.id === id);
}

export function formatPriceBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export const DEFAULT_ORG_ID = ORG;
