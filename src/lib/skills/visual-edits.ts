import type { StudioSkill } from "@/lib/skills/types";
import { CINEMATIC_PREMIUM_BAR, STACK_RULES } from "@/lib/skills/premium-design";

export const x09VisualEditsSkill: StudioSkill = {
  id: "x09-visual-edits",
  name: "Visual Edits",
  alwaysOn: true,
  plannerRules: "",
  builderFileRules: "",
  homePageRules: "",
  loginPageRules: "",
  dashboardPageRules: "",
  editRules: `
EDIÇÃO VISUAL POR CHAT (patch cirúrgico premium):
${STACK_RULES}
- Altere SÓ o necessário; devolva arquivo COMPLETO (não diff).
- Máximo 8 arquivos por patch.
- Mantenha exports (HomePage, LoginPage, DashboardPage) e props de navegação.
- Ao mudar cor/marca: propague para hero, CTAs, orbs, bordas, accents — consistência total.
- Ao adicionar seção: mesmo nível cinematográfico (motion + profundidade).
- Nunca degrade para template genérico ou texto placeholder.
${CINEMATIC_PREMIUM_BAR}
`.trim(),
};
