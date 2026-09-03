import { MESH_CREDIT_COST } from "@/lib/assets/mesh-tiers";
import { CREDIT_COSTS } from "@/lib/billing/credits";

/**
 * Conta nova: um Texto → 3D comercial + um site + 1 crédito de folga (edit).
 * Custo de aquisição — não entra na margem do pacote pago.
 */
export const SIGNUP_BONUS_CREDITS = 22;

export const BUILD_CREDIT_COST = CREDIT_COSTS.generation;
export const TEXT_TO_3D_CREDIT_COST = MESH_CREDIT_COST.game;

export const STUDIO_SUPPORT_EMAIL_FALLBACK = "studio@x09.com.br";

export const CREDIT_PACKAGE_CODES: [
  "basic",
  "plus",
  "pro",
  "studio",
] = ["basic", "plus", "pro", "studio"];

export type CreditPackageCode = (typeof CREDIT_PACKAGE_CODES)[number];

export type CreditPackage = {
  code: CreditPackageCode;
  name: string;
  credits: number;
  amountCents: number;
  blurb: string;
  highlighted?: boolean;
  features: string[];
};

/**
 * Pacotes à vista. Piso ~R$ 0,95/crédito no maior volume para o mix
 * pior (só sites) ainda cobrir Gemini + taxa Mercado Pago + margem.
 */
export const CREDIT_PACKAGES: readonly CreditPackage[] = [
  {
    code: "basic",
    name: "Start",
    credits: 36,
    amountCents: 4900,
    blurb: "Para validar uma ideia e gerar os primeiros assets.",
    features: [
      "36 créditos",
      "Até 12 sites ou 2 objetos 3D comerciais",
      "Preview e histórico",
      "Pagamento via Mercado Pago",
    ],
  },
  {
    code: "plus",
    name: "Plus",
    credits: 90,
    amountCents: 9900,
    blurb: "Para quem publica com alguma frequência.",
    features: [
      "90 créditos",
      "Até 30 sites ou 5 objetos 3D comerciais",
      "GitHub + deploy",
      "Pagamento via Mercado Pago",
    ],
  },
  {
    code: "pro",
    name: "Pro",
    credits: 180,
    amountCents: 18900,
    blurb: "Para quem constrói e publica toda semana.",
    highlighted: true,
    features: [
      "180 créditos",
      "Até 60 sites ou 10 objetos 3D comerciais",
      "Prioridade na fila de IA",
      "Suporte prioritário",
    ],
  },
  {
    code: "studio",
    name: "Studio",
    credits: 450,
    amountCents: 42900,
    blurb: "Para operação recorrente e equipe pequena.",
    features: [
      "450 créditos",
      "Até 150 sites ou 25 objetos 3D comerciais",
      "Melhor preço por crédito",
      "Suporte prioritário",
    ],
  },
];

export function isCreditPackageCode(value: string): value is CreditPackageCode {
  return (CREDIT_PACKAGE_CODES as readonly string[]).includes(value);
}

export function creditPackageByCode(
  code: string,
): CreditPackage | undefined {
  return CREDIT_PACKAGES.find((pack) => pack.code === code);
}

export function formatPackagePriceLabel(amountCents: number): string {
  return `R$ ${(amountCents / 100).toFixed(0)}`;
}

export function studioSupportEmail(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): string {
  return env.STUDIO_SUPPORT_EMAIL?.trim() || STUDIO_SUPPORT_EMAIL_FALLBACK;
}
