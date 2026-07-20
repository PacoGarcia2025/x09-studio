import "server-only";
import { fileExists, readProjectFile } from "@/lib/projects/fs.server";

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

function words(content: string): number {
  return (content.match(/[A-Za-zÀ-ÿ]{4,}/g) ?? []).length;
}

/**
 * Critic pós-build: bloqueia “Pronto” se o app ainda for genérico/incompleto.
 */
export async function critiqueGeneratedApp(
  projectId: string,
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
    if (/Bem-vindo|Este app foi gerado pelo X09|Lorem ipsum|Meu App/i.test(home)) {
      issues.push({
        code: "generic_copy",
        message: "Home ainda tem texto genérico do template",
        severity: "error",
      });
      score -= 30;
    }
    if (home.length < 1800 || words(home) < 70) {
      issues.push({
        code: "thin_home",
        message: "Home muito rasa — precisa de seções e copy real",
        severity: "error",
      });
      score -= 25;
    }
    const sections = (home.match(/<section\b/gi) ?? []).length;
    if (sections < 3) {
      issues.push({
        code: "few_sections",
        message: "Home precisa de pelo menos 3 seções",
        severity: "warn",
      });
      score -= 10;
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

  score = Math.max(0, Math.min(100, score));
  const hasError = issues.some((i) => i.severity === "error");
  return { ok: !hasError && score >= 60, score, issues };
}
