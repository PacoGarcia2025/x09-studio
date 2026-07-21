export type TemplateProfileId =
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

  for (const profile of TEMPLATE_PROFILES) {
    if (profile.match.test(text)) return profile;
  }

  return DEFAULT_PROFILE;
}

export function getTemplateProfile(id: TemplateProfileId): TemplateProfile {
  return TEMPLATE_PROFILES.find((p) => p.id === id) ?? DEFAULT_PROFILE;
}
