import { CINEMATIC_PREMIUM_BAR, STACK_RULES } from "@/lib/skills/premium-design";
import type { StudioSkill } from "@/lib/skills/types";

export const x09CoreSkill: StudioSkill = {
  id: "x09-core",
  name: "X09 Core",
  alwaysOn: true,
  plannerRules: `
- Produto entregável = qualidade de agência premium (R$15–30k), não MVP genérico.
- Extraia do pedido: nome da marca, paleta, cidade, telefone, WhatsApp, e-mail, CNPJ e registro profissional/órgão fiscalizador quando citados (ex.: CRECI só para imobiliárias).
- tasks.instruction deve repetir dados reais do cliente — nunca placeholders fictícios.
`.trim(),
  builderFileRules: STACK_RULES,
  homePageRules: `
${CINEMATIC_PREMIUM_BAR}
- Marca e contatos EXATOS do brief (nome, WhatsApp, endereço; registro profissional/órgão fiscalizador só se aplicável).
- Paleta: EXCLUSIVAMENTE a pedida no brief — nunca reverta para violeta genérico.
`.trim(),
  loginPageRules: `
- UI cinematográfica: card glass central, marca visível, toggle Entrar/Cadastro.
- Auth real via getSupabase().auth — nunca stub.
`.trim(),
  dashboardPageRules: `
- Layout premium: sidebar ou topbar densa, tipografia forte, estados loading/empty/error.
- CRUD funcional com dados do domínio do brief.
`.trim(),
  editRules: `
- Preserve qualidade premium ao editar — não simplifique para template genérico.
- TSX válido; mantenha framer-motion e hierarquia visual existente salvo se pedido mudar layout.
`.trim(),
};
