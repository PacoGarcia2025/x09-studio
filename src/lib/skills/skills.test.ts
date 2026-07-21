import { describe, expect, it } from "vitest";
import { ensureImobiliaria360Tasks } from "@/lib/pipeline/planner-imobiliaria";
import type { StudioPlan } from "@/lib/pipeline/plan-schema";
import {
  buildAgentBuildSkillAddon,
  buildAgentPlanSkillAddon,
} from "@/lib/skills/agent-bridge";
import { evaluateHomeWithSkills } from "@/lib/skills/code-review";
import { isImobiliaria360, isLuxuryLight } from "@/lib/skills/detect";
import { pickTemplateProfile } from "@/lib/skills/templates/catalog";
import { resolveSkills } from "@/lib/skills/resolve";
import { resolveSkillIds, getProductType } from "@/lib/skills/registry";

const PORTAL_PROMPT =
  "Portal imobiliário de luxo 360° com CRM corretor, catálogo de imóveis, smart search, ouro champagne #D4AF37 off-white #FAFAFA";

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

  it("activates saas skill for CRM prompt without imobiliaria combo", () => {
    const ids = resolveSkillIds(
      "CRM SaaS backoffice gestão de contratos multi-tenant",
    );
    expect(ids).toContain("x09-saas-builder");
    expect(ids).not.toContain("x09-imobiliaria-360");
  });

  it("composes cinematic rules in home prompt", () => {
    const skills = resolveSkills("site premium cinematográfico verde oliva");
    expect(skills.homePageSystem).toMatch(/framer-motion/i);
    expect(skills.homePageSystem).toMatch(/gradientes mesh/i);
    expect(skills.homePageSystem).not.toMatch(/#7C3AED.*obrigat/i);
    expect(skills.homePageSystem).toMatch(/<h1>/i);
  });

  it("picks saas-crm template profile for pure SaaS prompts", () => {
    const profile = pickTemplateProfile(
      "CRM SaaS backoffice gestão de contratos",
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

describe("fase 3 — imobiliária 360°", () => {
  it("detects portal imobiliário 360", () => {
    expect(isImobiliaria360(PORTAL_PROMPT)).toBe(true);
    expect(isLuxuryLight(PORTAL_PROMPT)).toBe(true);
  });

  it("activates imobiliaria + luxury skills", () => {
    const ids = resolveSkillIds(PORTAL_PROMPT);
    expect(ids).toContain("x09-imobiliaria-360");
    expect(ids).toContain("x09-luxury-light");
    expect(ids).toContain("x09-saas-builder");
    expect(ids).toContain("x09-enterprise-publish");
    expect(getProductType(PORTAL_PROMPT)).toBe("portal");
  });

  it("enterprise publish skill is always active", () => {
    const ids = resolveSkillIds("landing simples");
    expect(ids).toContain("x09-enterprise-publish");
  });

  it("resolves imobiliaria scaffold and page systems", () => {
    const skills = resolveSkills(PORTAL_PROMPT);
    expect(skills.templateProfileId).toBe("imobiliaria-360");
    expect(skills.templateScaffoldId).toBe("imobiliaria-360-starter");
    expect(skills.listingsPageSystem).toMatch(/ListingsPage/i);
    expect(skills.propertyDetailPageSystem).toMatch(/PropertyDetailPage/i);
    expect(skills.homePageSystem).toMatch(/#FAFAFA|FAFAFA|luxury|champagne/i);
  });

  it("planner injects 9+ imobiliaria tasks", () => {
    const base: StudioPlan = {
      project: { name: "Portal", description: "Imobiliária 360" },
      summary: "Portal imobiliário",
      modules: [{ id: "m1", name: "Core", description: "Páginas" }],
      pages: [{ path: "/", name: "Home", description: "Home" }],
      database: { tables: [] },
      apis: [],
      auth: { providers: ["email"], roles: ["visitor", "user"] },
      integrations: [],
      tasks: [
        {
          id: "t1",
          type: "update_file",
          title: "Placeholder",
          instruction: "x",
          path: "src/pages/HomePage.tsx",
          dependsOn: [],
        },
        {
          id: "t2",
          type: "update_file",
          title: "Placeholder 2",
          instruction: "y",
          path: "src/pages/LoginPage.tsx",
          dependsOn: [],
        },
        {
          id: "t3",
          type: "update_file",
          title: "Placeholder 3",
          instruction: "z",
          path: "src/App.tsx",
          dependsOn: [],
        },
      ],
    };
    const plan = ensureImobiliaria360Tasks(base, PORTAL_PROMPT);
    expect(plan.tasks.length).toBeGreaterThanOrEqual(9);
    expect(plan.tasks.some((t) => t.path === "src/lib/properties.ts")).toBe(true);
    expect(plan.tasks.some((t) => t.path === "src/pages/ListingsPage.tsx")).toBe(
      true,
    );
    expect(plan.tasks.some((t) => t.path === "src/pages/BrokerDashboardPage.tsx")).toBe(
      true,
    );
  });
});
