import "server-only";
import type { RepairIssue, QualityGateStatus } from "@/lib/agent/schemas";
import { evaluateVisualExperience } from "@/lib/pipeline/visual-intelligence";
import { fileExists, readProjectFile } from "@/lib/projects/fs.server";
import {
  findBrokenImports,
  findDisallowedNpmImports,
  findInvalidLucideImports,
  findUndeclaredJsxIdentifiers,
  formatBrokenImportMessage,
  formatDisallowedNpmMessage,
  formatInvalidLucideMessage,
  formatUndeclaredJsxMessage,
} from "@/lib/projects/import-graph.server";
import { IMOBILIARIA_PAGES } from "@/lib/skills/imobiliaria-360";
import { isImobiliaria360 } from "@/lib/skills/detect";
import {
  evaluateDashboardWithSkills,
  evaluateHomeWithSkills,
} from "@/lib/skills/code-review";
import {
  countPageSections,
  meetsPremiumSectionBar,
} from "@/lib/pipeline/page-sections";

export type QualityIssue = {
  code: string;
  message: string;
  severity: "error" | "warn";
};

export type QualityReport = {
  ok: boolean;
  score: number;
  issues: QualityIssue[];
};

export type UnifiedQualityGate = {
  status: QualityGateStatus;
  score: number;
  issues: RepairIssue[];
  summary: string;
};

function words(content: string): number {
  return (content.match(/[A-Za-zÀ-ÿ]{4,}/g) ?? []).length;
}

function makeRepairIssueFromQuality(issue: QualityIssue, source: RepairIssue["source"] = "quality"): RepairIssue {
  return {
    id: `quality-${issue.code}`,
    category: "other",
    severity: issue.severity === "error" ? "error" : "warning",
    message: issue.message,
    source,
    suggestion: "Revisar a qualidade final do app antes de concluir.",
    status: "open",
  };
}

function issueFingerprint(issue: Pick<RepairIssue, "file" | "message" | "category">): string {
  return `${issue.category ?? "other"}:${issue.file ?? "_"}:${issue.message}`.toLowerCase();
}

export function evaluateUnifiedQualityGate(input: {
  qualityReport?: QualityReport;
  repairIssues?: RepairIssue[];
  repairCycles?: number;
  maxRepairCycles?: number;
}): UnifiedQualityGate {
  const maxRepairCycles = input.maxRepairCycles ?? 3;
  const qualityIssues = (input.qualityReport?.issues ?? []).map((issue) =>
    makeRepairIssueFromQuality(issue),
  );
  const allIssues = [...(input.repairIssues ?? []), ...qualityIssues];
  const serializableIssues = allIssues.map((issue) => ({
    ...issue,
    fingerprint: issue.fingerprint ?? issueFingerprint(issue),
  }));
  const errorIssues = serializableIssues.filter((issue) => issue.severity === "error");
  const repeated = Object.values(
    serializableIssues.reduce<Record<string, number>>((acc, issue) => {
      const key = issue.fingerprint ?? issueFingerprint(issue);
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {}),
  ).some((count) => count > 1);

  const cycles = input.repairCycles ?? 0;
  if (input.qualityReport && input.qualityReport.ok && errorIssues.length === 0 && !repeated) {
    return {
      status: "PASS",
      score: input.qualityReport.score,
      issues: [],
      summary: "Qualidade final aprovada.",
    };
  }

  if (input.qualityReport && input.qualityReport.ok && errorIssues.length === 0 && cycles >= 0 && !repeated) {
    return {
      status: "IMPROVE",
      score: input.qualityReport.score,
      issues: serializableIssues,
      summary: "Visual funcional e consistente, mas ainda precisa de direção premium e identidade mais forte.",
    };
  }

  if (errorIssues.length > 0 && cycles < maxRepairCycles && !repeated) {
    return {
      status: "IMPROVE",
      score: input.qualityReport?.score ?? 0,
      issues: serializableIssues,
      summary: `Qualidade insuficiente. Reparar os problemas reais detectados (${errorIssues.length} relevantes).`,
    };
  }

  return {
    status: "FAIL",
    score: input.qualityReport?.score ?? 0,
    issues: serializableIssues,
    summary:
      repeated
        ? "Falta de progresso detectada: a mesma falha se repetiu; loop de repair interrompido."
        : cycles >= maxRepairCycles
          ? `Limite de ${maxRepairCycles} ciclos de repair atingido.`
          : "Falha de qualidade detectada e não passou no gate mínimo.",
  };
}

/** Critic da fase 1 — só HomePage premium, sem exigir Login/App. */
export async function critiqueHomePreview(
  projectId: string,
  briefPrompt?: string,
): Promise<QualityReport> {
  const issues: QualityIssue[] = [];
  let score = 100;

  const homeExists = await fileExists(projectId, "src/pages/HomePage.tsx");
  if (!homeExists) {
    issues.push({
      code: "missing_home",
      message: "Falta src/pages/HomePage.tsx",
      severity: "error",
    });
    score -= 50;
  } else {
    const home = await readProjectFile(projectId, "src/pages/HomePage.tsx");

    for (const gate of evaluateHomeWithSkills(home, briefPrompt ?? "")) {
      issues.push({
        code: gate.code,
        message: gate.message,
        severity: gate.severity,
      });
      score -= gate.penalty;
    }

    const visual = evaluateVisualExperience(home, briefPrompt ?? "", "premium");
    if (visual.verdict === "FAIL") {
      issues.push({
        code: "visual_functional_only",
        message: `Visual funcional apenas: ${visual.reasons.join(" ")}`,
        severity: "error",
      });
      score -= 25;
    } else if (visual.verdict === "IMPROVE") {
      issues.push({
        code: "visual_professional_only",
        message: `Visual profissional, mas ainda sem WOW: ${visual.reasons.join(" ")}`,
        severity: "warn",
      });
      score -= 10;
    }

    if (/Bem-vindo|Este app foi gerado pelo X09|Lorem ipsum|Meu App/i.test(home)) {
      issues.push({
        code: "generic_copy",
        message: "Home ainda tem texto genérico do template",
        severity: "error",
      });
      score -= 30;
    }

    const sections = countPageSections(home);
    if (!meetsPremiumSectionBar(home, 4)) {
      issues.push({
        code: "thin_home",
        message: `Home precisa de mais estrutura (${sections} blocos — premium exige 4+ seções ou conteúdo denso)`,
        severity: "error",
      });
      score -= 20;
    }

    if (home.length < 1800) {
      issues.push({
        code: "short_home",
        message: "Home muito rasa para padrão cinematográfico premium",
        severity: "error",
      });
      score -= 25;
    }
  }

  const broken = await findBrokenImports(projectId);
  if (broken.length > 0) {
    issues.push({
      code: "broken_imports",
      message: formatBrokenImportMessage(broken),
      severity: "error",
    });
    score -= 35;
  }

  const disallowed = await findDisallowedNpmImports(projectId);
  if (disallowed.length > 0) {
    issues.push({
      code: "disallowed_npm",
      message: formatDisallowedNpmMessage(disallowed),
      severity: "error",
    });
    score -= 30;
  }

  const undeclaredJsx = await findUndeclaredJsxIdentifiers(projectId);
  if (undeclaredJsx.length > 0) {
    issues.push({
      code: "undeclared_jsx",
      message: formatUndeclaredJsxMessage(undeclaredJsx),
      severity: "error",
    });
    score -= 35;
  }

  const invalidLucide = await findInvalidLucideImports(projectId);
  if (invalidLucide.length > 0) {
    issues.push({
      code: "invalid_lucide",
      message: formatInvalidLucideMessage(invalidLucide),
      severity: "error",
    });
    score -= 35;
  }

  score = Math.max(0, Math.min(100, score));
  const hasError = issues.some((i) => i.severity === "error");
  return { ok: !hasError && score >= 55, score, issues };
}

/**
 * Critic pós-build: bloqueia “Pronto” se o app ainda for genérico/incompleto.
 */
export async function critiqueGeneratedApp(
  projectId: string,
  briefPrompt?: string,
): Promise<QualityReport> {
  const issues: QualityIssue[] = [];
  let score = 100;

  const homeExists = await fileExists(projectId, "src/pages/HomePage.tsx");
  const loginExists = await fileExists(projectId, "src/pages/LoginPage.tsx");
  const appExists = await fileExists(projectId, "src/App.tsx");

  if (!homeExists) {
    issues.push({
      code: "missing_home",
      message: "Falta src/pages/HomePage.tsx",
      severity: "error",
    });
    score -= 40;
  }

  if (!loginExists) {
    issues.push({
      code: "missing_login",
      message: "Falta src/pages/LoginPage.tsx (login obrigatório)",
      severity: "error",
    });
    score -= 25;
  }

  if (!appExists) {
    issues.push({
      code: "missing_app",
      message: "Falta src/App.tsx",
      severity: "error",
    });
    score -= 30;
  }

  if (homeExists) {
    const home = await readProjectFile(projectId, "src/pages/HomePage.tsx");

    for (const gate of evaluateHomeWithSkills(home, briefPrompt ?? "")) {
      issues.push({
        code: gate.code,
        message: gate.message,
        severity: gate.severity,
      });
      score -= gate.penalty;
    }

    if (/Bem-vindo|Este app foi gerado pelo X09|Lorem ipsum|Meu App/i.test(home)) {
      issues.push({
        code: "generic_copy",
        message: "Home ainda tem texto genérico do template",
        severity: "error",
      });
      score -= 30;
    }
    const sections = countPageSections(home);
    if (!meetsPremiumSectionBar(home, 4)) {
      issues.push({
        code: "few_sections",
        message: `Home precisa de mais estrutura (${sections} blocos — premium exige 4+ seções ou conteúdo denso)`,
        severity: "error",
      });
      score -= 15;
    }

    if (home.length < 2200 || words(home) < 85) {
      issues.push({
        code: "thin_home",
        message: "Home muito rasa para padrão cinematográfico premium",
        severity: "error",
      });
      score -= 25;
    }
  }

  if (loginExists) {
    const login = await readProjectFile(projectId, "src/pages/LoginPage.tsx");
    if (/próximas sprints|Auth Supabase será configurado/i.test(login)) {
      issues.push({
        code: "stub_login",
        message: "Login ainda é stub do template",
        severity: "error",
      });
      score -= 25;
    }
    if (
      !/getSupabase|signInWithPassword|supabase\.auth/.test(login)
    ) {
      issues.push({
        code: "login_no_auth",
        message: "Login não chama Supabase Auth",
        severity: "error",
      });
      score -= 20;
    }
    if (!/type=["']email["']|type=\{?["']email["']\}?/i.test(login) && !/email/i.test(login)) {
      issues.push({
        code: "login_no_email",
        message: "Login sem campo de e-mail",
        severity: "error",
      });
      score -= 15;
    }
    if (login.length < 800) {
      issues.push({
        code: "thin_login",
        message: "Login incompleto",
        severity: "warn",
      });
      score -= 10;
    }
  }

  const dashboardExists = await fileExists(
    projectId,
    "src/pages/DashboardPage.tsx",
  );
  if (dashboardExists) {
    const dash = await readProjectFile(projectId, "src/pages/DashboardPage.tsx");
    for (const gate of evaluateDashboardWithSkills(dash)) {
      issues.push({
        code: gate.code,
        message: gate.message,
        severity: gate.severity,
      });
      score -= gate.penalty;
    }
    if (/em breve|próximas sprints/i.test(dash)) {
      issues.push({
        code: "stub_dashboard",
        message: "Dashboard ainda é stub",
        severity: "error",
      });
      score -= 20;
    }
  }

  if (appExists) {
    const app = await readProjectFile(projectId, "src/App.tsx");
    if (!/LoginPage/.test(app)) {
      issues.push({
        code: "app_no_login_route",
        message: "App.tsx não navega para LoginPage",
        severity: "error",
      });
      score -= 20;
    }
    if (/AppShell|Meu App/.test(app)) {
      issues.push({
        code: "template_shell",
        message: "App ainda usa shell genérico Meu App",
        severity: "error",
      });
      score -= 15;
    }
  }

  const broken = await findBrokenImports(projectId);
  if (broken.length > 0) {
    issues.push({
      code: "broken_imports",
      message: formatBrokenImportMessage(broken),
      severity: "error",
    });
    score -= 35;
  }

  const disallowed = await findDisallowedNpmImports(projectId);
  if (disallowed.length > 0) {
    issues.push({
      code: "disallowed_npm",
      message: formatDisallowedNpmMessage(disallowed),
      severity: "error",
    });
    score -= 30;
  }

  const undeclaredJsx = await findUndeclaredJsxIdentifiers(projectId);
  if (undeclaredJsx.length > 0) {
    issues.push({
      code: "undeclared_jsx",
      message: formatUndeclaredJsxMessage(undeclaredJsx),
      severity: "error",
    });
    score -= 35;
  }

  const invalidLucide = await findInvalidLucideImports(projectId);
  if (invalidLucide.length > 0) {
    issues.push({
      code: "invalid_lucide",
      message: formatInvalidLucideMessage(invalidLucide),
      severity: "error",
    });
    score -= 35;
  }

  if (briefPrompt && isImobiliaria360(briefPrompt)) {
    for (const rel of IMOBILIARIA_PAGES) {
      if (!(await fileExists(projectId, rel))) {
        issues.push({
          code: "missing_imob_page",
          message: `Portal imobiliário incompleto: falta ${rel}`,
          severity: "error",
        });
        score -= 20;
      }
    }
  }

  score = Math.max(0, Math.min(100, score));
  const hasError = issues.some((i) => i.severity === "error");
  return { ok: !hasError && score >= 60, score, issues };
}
