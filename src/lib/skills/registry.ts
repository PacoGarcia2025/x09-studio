import { x09CoreSkill } from "@/lib/skills/core";
import { x09LandingPagesSkill } from "@/lib/skills/landing-pages";
import { x09SaasBuilderSkill } from "@/lib/skills/saas-builder";
import { x09VisualEditsSkill } from "@/lib/skills/visual-edits";
import { x09CodeReviewSkill } from "@/lib/skills/code-review-meta";
import { x09TemplatesSkill } from "@/lib/skills/templates/skill";
import { x09SeoPerformanceSkill } from "@/lib/skills/seo-performance/skill";
import { x09LuxuryLightSkill } from "@/lib/skills/luxury-light";
import { x09Imobiliaria360Skill } from "@/lib/skills/imobiliaria-360";
import { isImobiliaria360, isLuxuryLight } from "@/lib/skills/detect";
import type { ProductType, SkillId, StudioSkill } from "@/lib/skills/types";

export const SKILL_REGISTRY: Record<SkillId, StudioSkill> = {
  "x09-core": x09CoreSkill,
  "x09-landing-pages": x09LandingPagesSkill,
  "x09-saas-builder": x09SaasBuilderSkill,
  "x09-visual-edits": x09VisualEditsSkill,
  "x09-code-review": x09CodeReviewSkill,
  "x09-templates": x09TemplatesSkill,
  "x09-seo-performance": x09SeoPerformanceSkill,
  "x09-luxury-light": x09LuxuryLightSkill,
  "x09-imobiliaria-360": x09Imobiliaria360Skill,
};

const ALWAYS_ON: SkillId[] = [
  "x09-core",
  "x09-visual-edits",
  "x09-code-review",
  "x09-templates",
  "x09-seo-performance",
];

export function pickProductSkillIds(prompt: string): SkillId[] {
  if (isImobiliaria360(prompt)) {
    return ["x09-imobiliaria-360", "x09-saas-builder"];
  }

  const saas =
    /\b(saas|crm|dashboard|painel|admin|contratos|alugu[eé]l|gest[aã]o|erp|backoffice|cadastro de clientes|multi.?tenant)\b/i.test(
      prompt,
    );
  return saas ? ["x09-saas-builder"] : ["x09-landing-pages"];
}

export function resolveSkillIds(prompt: string): SkillId[] {
  const product = pickProductSkillIds(prompt);
  const set = new Set<SkillId>([...ALWAYS_ON, ...product]);
  if (isLuxuryLight(prompt)) {
    set.add("x09-luxury-light");
  }
  return [...set];
}

export function getProductType(prompt: string): ProductType {
  if (isImobiliaria360(prompt)) return "portal";
  return pickProductSkillIds(prompt).includes("x09-saas-builder")
    ? "saas"
    : "landing";
}

export function getActiveSkills(prompt: string): StudioSkill[] {
  return resolveSkillIds(prompt).map((id) => SKILL_REGISTRY[id]);
}

export function getSkill(id: SkillId): StudioSkill {
  return SKILL_REGISTRY[id];
}
