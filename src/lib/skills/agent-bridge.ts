import { CINEMATIC_PREMIUM_BAR, STACK_RULES } from "@/lib/skills/premium-design";
import { resolveSkills } from "@/lib/skills/resolve";
import { templatePlannerAddon } from "@/lib/skills/templates/skill";

/**
 * Injeta skills X09 nos prompts do Agent stream (/api/llm/stream).
 * Traduz regras do pipeline (Vite/src/*) para o formato multi-arquivo do Agent (/pages/*).
 */
export function buildAgentPlanSkillAddon(prompt: string): string {
  const skills = resolveSkills(prompt);
  const template = templatePlannerAddon(prompt);

  return `
═══ X09 SKILLS (Agent) ═══
Ativas: ${skills.ids.join(", ")}
Tipo: ${skills.productType}

${template}

${skills.plannerAddon}

Regras Agent:
- visualDirection no AppSpec DEVE citar cor de marca EXATA do brief do cliente.
- Copy pt-BR premium — dados reais (nome, telefone, cidade, registro profissional se houver), nunca fictícios genéricos.
- acceptanceCriteria deve incluir motion, profundidade visual e SEO (h1 único, footer NAP).
`.trim();
}

export function buildAgentBuildSkillAddon(prompt: string): string {
  const skills = resolveSkills(prompt);

  return `
═══ X09 SKILLS — BUILD PREMIUM ═══
${CINEMATIC_PREMIUM_BAR}

${STACK_RULES.replace(/src\//g, "").replace(/HomePage/g, "Home")}

Brief fidelity:
- Cor de marca do pedido do usuário — PROIBIDO purple-pink genérico se brief pedir outra paleta.
- framer-motion + lucide-react obrigatórios.
- Produto nível R$20k — se parecer template Wix/Canva, falhou.

${skills.homePageSystem.slice(0, 3500)}
`.trim();
}

export function buildAgentEditSkillAddon(prompt: string): string {
  const skills = resolveSkills(prompt);

  return `
═══ X09 SKILLS — EDIT ═══
${skills.editPatchRules}

Formato Agent: devolva blocos \`\`\`tsx path="/pages/Home.tsx"\` COMPLETOS.
Preserve motion, profundidade visual e dados reais do brief.
TSX válido — feche todas as tags.
`.trim();
}

export function buildAgentRepairSkillAddon(): string {
  return `
═══ X09 SKILLS — REPAIR ═══
Priorize: syntax JSX, imports, ícones lucide inválidos, framer-motion quebrado.
Após correção, preserve qualidade cinematográfica (gradientes, motion).
`.trim();
}
