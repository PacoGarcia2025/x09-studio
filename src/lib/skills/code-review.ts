import { containsGenericPlaceholder } from "@/lib/pipeline/brief-context";
import { hasValidTsxSyntax } from "@/lib/pipeline/jsx-validate";
import type { SkillQualityIssue } from "@/lib/skills/types";
import { getActiveSkills } from "@/lib/skills/registry";

export function evaluateHomeWithSkills(
  home: string,
  brief: string,
): SkillQualityIssue[] {
  const issues: SkillQualityIssue[] = [];

  if (!hasValidTsxSyntax(home, "src/pages/HomePage.tsx")) {
    issues.push({
      code: "home_syntax",
      message: "HomePage.tsx com erro de sintaxe JSX",
      severity: "error",
      penalty: 35,
    });
  }

  if (containsGenericPlaceholder(home)) {
    issues.push({
      code: "generic_copy",
      message: 'Copy genérica ("Sua Empresa", etc.) — inaceitável em produto premium',
      severity: "error",
      penalty: 25,
    });
  }

  for (const skill of getActiveSkills(brief)) {
    if (!skill.evaluateHome) continue;
    issues.push(...skill.evaluateHome(home, brief));
  }

  return issues;
}

export function evaluateDashboardWithSkills(dashboard: string): SkillQualityIssue[] {
  const issues: SkillQualityIssue[] = [];

  if (!hasValidTsxSyntax(dashboard, "src/pages/DashboardPage.tsx")) {
    issues.push({
      code: "dashboard_syntax",
      message: "DashboardPage.tsx com erro de sintaxe",
      severity: "error",
      penalty: 30,
    });
  }

  if (dashboard.length < 1500) {
    issues.push({
      code: "thin_dashboard",
      message: "Dashboard raso demais para padrão SaaS premium",
      severity: "error",
      penalty: 20,
    });
  }

  if (!/useState|useEffect/.test(dashboard)) {
    issues.push({
      code: "dashboard_no_state",
      message: "Dashboard sem gestão de estado",
      severity: "error",
      penalty: 15,
    });
  }

  return issues;
}
