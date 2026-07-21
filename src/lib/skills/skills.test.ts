import { describe, expect, it } from "vitest";
import {
  buildAgentBuildSkillAddon,
  buildAgentPlanSkillAddon,
} from "@/lib/skills/agent-bridge";
import { evaluateHomeWithSkills } from "@/lib/skills/code-review";
import { pickTemplateProfile } from "@/lib/skills/templates/catalog";
import { resolveSkills } from "@/lib/skills/resolve";
import { resolveSkillIds } from "@/lib/skills/registry";

describe("x09 skills", () => {
  it("activates landing skills for marcenaria prompt", () => {
    const ids = resolveSkillIds(
      "landing premium para marcenaria verde oliva SGO Imób",
    );
    expect(ids).toContain("x09-core");
    expect(ids).toContain("x09-landing-pages");
    expect(ids).toContain("x09-templates");
    expect(ids).toContain("x09-seo-performance");
    expect(ids).not.toContain("x09-saas-builder");
  });

  it("activates saas skill for CRM prompt", () => {
    const ids = resolveSkillIds(
      "CRM imobiliário com dashboard gestão de contratos",
    );
    expect(ids).toContain("x09-saas-builder");
    expect(ids).toContain("x09-templates");
    expect(ids).toContain("x09-seo-performance");
  });

  it("composes cinematic rules in home prompt", () => {
    const skills = resolveSkills("site premium cinematográfico verde oliva");
    expect(skills.homePageSystem).toMatch(/framer-motion/i);
    expect(skills.homePageSystem).toMatch(/gradientes mesh/i);
    expect(skills.homePageSystem).not.toMatch(/#7C3AED.*obrigat/i);
    expect(skills.homePageSystem).toMatch(/<h1>/i);
  });

  it("picks saas-crm template profile for CRM prompts", () => {
    const profile = pickTemplateProfile(
      "CRM imobiliário com dashboard gestão de contratos",
    );
    expect(profile.id).toBe("saas-crm");
    expect(profile.scaffoldId).toBe("react-supabase-starter");
  });

  it("includes template metadata in resolved skills", () => {
    const skills = resolveSkills("landing premium marcenaria");
    expect(skills.templateProfileId).toBe("landing-premium");
    expect(skills.templateScaffoldId).toBe("react-supabase-starter");
    expect(skills.plannerAddon).toMatch(/Landing Premium/i);
  });

  it("agent bridge injects skills into plan and build prompts", () => {
    const prompt = "site imobiliária laranja SGO Imóveis CRECI 12345";
    const plan = buildAgentPlanSkillAddon(prompt);
    const build = buildAgentBuildSkillAddon(prompt);
    expect(plan).toMatch(/x09-templates/i);
    expect(plan).toMatch(/x09-seo-performance/i);
    expect(build).toMatch(/framer-motion/i);
    expect(build).toMatch(/R\$20k/i);
  });

  it("seo skill flags missing semantic structure on home", () => {
    const thinHome = `export function HomePage() {
      return <div><p>SGO Imóveis</p></div>;
    }`;
    const issues = evaluateHomeWithSkills(
      thinHome,
      "SGO Imóveis imobiliária premium",
    );
    expect(issues.some((i) => i.code === "seo_h1")).toBe(true);
    expect(issues.some((i) => i.code === "seo_semantic")).toBe(true);
  });
});
