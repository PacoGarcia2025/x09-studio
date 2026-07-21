import type { StudioSkill } from "@/lib/skills/types";
import { pickTemplateProfile } from "@/lib/skills/templates/catalog";

export const x09TemplatesSkill: StudioSkill = {
  id: "x09-templates",
  name: "Templates Premium",
  plannerRules: `
- Escolha estrutura coerente com o perfil de template (landing vs SaaS vs portfólio).
- Tasks devem refletir o layout do perfil — não misture CRM pesado em landing simples.
`.trim(),
  builderFileRules: "",
  homePageRules: "",
  loginPageRules: "",
  dashboardPageRules: "",
  editRules: `
- Preserve a arquitetura do template/perfíl ao editar — não remova seções core do perfil.
`.trim(),
};

/** Regras dinâmicas do perfil escolhido para o prompt. */
export function templatePlannerAddon(prompt: string): string {
  const profile = pickTemplateProfile(prompt);
  return `[Template: ${profile.label} (${profile.id})]
Scaffold: ${profile.scaffoldId}
${profile.generationHints}`;
}

export function templateScaffoldId(prompt: string): string {
  return pickTemplateProfile(prompt).scaffoldId;
}
