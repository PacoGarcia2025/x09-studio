import { isImobiliaria360 } from "@/lib/skills/detect";

export type TemplateProfileId =
  | "imobiliaria-360"
  | "landing-premium"
  | "saas-crm"
  | "portfolio-agency";

export type TemplateProfile = {
  id: TemplateProfileId;
  /** Pasta em templates/ usada no scaffold. */
  scaffoldId: string;
  label: string;
  description: string;
  /** Hint para planner/builder. */
  generationHints: string;
  match: RegExp;
};

export const TEMPLATE_PROFILES: TemplateProfile[] = [
  {
    id: "imobiliaria-360",
    scaffoldId: "imobiliaria-360-starter",
    label: "Imobiliária 360°",
    description:
      "Portal imobiliário multi-página: catálogo, detalhe, CRM corretor, portal proprietário e admin BI.",
    generationHints:
      "15–25 tasks: properties.ts mock, Home smart search, ListingsPage filtros+mapa, PropertyDetailPage imersiva, Login multi-persona, Broker/Owner/Admin dashboards, App.tsx roteamento completo.",
    match:
      /\b(portal imobili[aá]rio|imobili[aá]ria 360|360[°º]?|smart search|cat[aá]logo de im[oó]veis|listagem de im[oó]veis|corretor(es)?|carteira de im[oó]veis|vgv|matterport|penthouse|im[oó]veis exclusivos)\b/i,
  },
  {
    id: "landing-premium",
    scaffoldId: "react-supabase-starter",
    label: "Landing Premium",
    description:
      "Landing cinematográfica de alta conversão com auth opcional.",
    generationHints:
      "Foco total na HomePage premium: hero, prova social, serviços, CTA, footer com contatos reais.",
    match:
      /\b(landing|site institucional|p[aá]gina|marcenaria|imobili[aá]ria|cl[ií]nica|restaurante|portf[oó]lio|ag[eê]ncia|studio|loja)\b/i,
  },
  {
    id: "saas-crm",
    scaffoldId: "react-supabase-starter",
    label: "SaaS / CRM",
    description: "Produto SaaS com login, dashboard e CRUD denso.",
    generationHints:
      "Priorize DashboardPage com KPIs, tabela, formulários CRUD e login real Supabase.",
    match:
      /\b(saas|crm|erp|dashboard|painel|admin|gest[aã]o|contratos|alugu[eé]l|multi.?tenant|backoffice)\b/i,
  },
  {
    id: "portfolio-agency",
    scaffoldId: "react-supabase-starter",
    label: "Portfólio / Agência",
    description: "Showcase visual premium com cases e contato.",
    generationHints:
      "Galeria/cases em bento grid, depoimentos, processo criativo, CTA contato.",
    match: /\b(portf[oó]lio|ag[eê]ncia|design|fotografia|arquitetura|cases|showcase)\b/i,
  },
];

const DEFAULT_PROFILE = TEMPLATE_PROFILES[0]!;

export function pickTemplateProfile(prompt: string): TemplateProfile {
  const text = prompt.trim();
  if (!text) return DEFAULT_PROFILE;

  if (isImobiliaria360(text)) {
    return TEMPLATE_PROFILES.find((p) => p.id === "imobiliaria-360")!;
  }

  for (const profile of TEMPLATE_PROFILES) {
    if (profile.match.test(text)) return profile;
  }

  return DEFAULT_PROFILE;
}

export function getTemplateProfile(id: TemplateProfileId): TemplateProfile {
  return TEMPLATE_PROFILES.find((p) => p.id === id) ?? DEFAULT_PROFILE;
}
