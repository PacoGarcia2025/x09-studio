export type { ProductType, ResolvedSkills, SkillId, StudioSkill } from "@/lib/skills/types";
export type { TemplateProfile, TemplateProfileId } from "@/lib/skills/templates/catalog";
export { resolveSkills } from "@/lib/skills/resolve";
export {
  resolveSkillIds,
  getProductType,
  getActiveSkills,
  SKILL_REGISTRY,
} from "@/lib/skills/registry";
export {
  evaluateHomeWithSkills,
  evaluateDashboardWithSkills,
} from "@/lib/skills/code-review";
export {
  lacksCinematicQuality,
  lacksPremiumQuality,
  CINEMATIC_PREMIUM_BAR,
} from "@/lib/skills/premium-design";
export { LUXURY_LIGHT_BAR } from "@/lib/skills/luxury-light";
export { isImobiliaria360, isLuxuryLight } from "@/lib/skills/detect";
export {
  IMOBILIARIA_PAGES,
  x09Imobiliaria360Skill,
} from "@/lib/skills/imobiliaria-360";
export {
  pickTemplateProfile,
  TEMPLATE_PROFILES,
  getTemplateProfile,
} from "@/lib/skills/templates/catalog";
export {
  templateScaffoldId,
  templatePlannerAddon,
} from "@/lib/skills/templates/skill";
export {
  buildAgentPlanSkillAddon,
  buildAgentBuildSkillAddon,
  buildAgentEditSkillAddon,
  buildAgentRepairSkillAddon,
} from "@/lib/skills/agent-bridge";
