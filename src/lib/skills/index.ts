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
  CINEMATIC_PREMIUM_BAR,
} from "@/lib/skills/premium-design";
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
