import type { LlmProvider } from "@/lib/llm/types";
import { resolveSkills } from "@/lib/skills/resolve";
import {
  PLAN_JSON_SHAPE_HINT,
  normalizePlannerPayload,
  studioPlanSchema,
  type StudioPlan,
} from "@/lib/pipeline/plan-schema";

const SYSTEM_PROMPT = `Você é o Planner do X09 Studio, um gerador de software.
Sua ÚNICA função é transformar o pedido do usuário em um PLANO estruturado em JSON.

Regras obrigatórias:
- Responda APENAS com um único objeto JSON válido (sem markdown, sem texto fora do JSON).
- Idioma: português (Brasil).
- Stack FIXA dos apps gerados: Vite + React + TypeScript + Supabase (template react-supabase-starter).
- NÃO planeje Next.js App Router. NÃO use paths como src/app/page.tsx.
- Paths reais do template (use estes):
  - src/App.tsx
  - src/pages/HomePage.tsx  (página principal — SEMPRE)
  - src/pages/LoginPage.tsx (login/signup — SEMPRE, com getSupabase().auth)
  - src/pages/DashboardPage.tsx (obrigatório se SaaS/CRM/painel/admin)
  - src/lib/supabase.ts
  - src/index.css
- App COMPLETO (não só uma página):
  - Task #1: update_file src/App.tsx — navegação Home + Login (+ Dashboard se SaaS), SEM AppShell, SEM "Meu App".
  - Task #2: update_file src/pages/HomePage.tsx — página principal COMPLETA com copy real do negócio.
  - Task #3: update_file src/pages/LoginPage.tsx — auth real via getSupabase().auth.signInWithPassword / signUp.
  - SaaS/CRM/dashboard/painel: Task DashboardPage com lista + formulário CRUD (supabase.from).
  - Evite tasks de migrate/build/typecheck.
- NÃO escreva o código-fonte completo no JSON do plano (só instruções).
- Em "tasks.instruction", inclua nome da marca, paleta de cores, contatos e cidade EXATOS do pedido do usuário.
- Em "tasks.instruction", descreva seções e tom em 3–6 frases para Home/Login.
- tasks tipadas: create_file, update_file, delete_file, run_command, sql_migration, env_set.
- Entre 4 e 20 tasks. Landing: 4–8. SaaS: 8–16.
- Cada task: "id" único e "dependsOn" quando houver dependência.
- database.tables, auth.providers e auth.roles DEVEM ser arrays.
- auth.providers: ["email"], auth.roles mínimos: ["visitor","user"].
- Integrações: só o necessário (Supabase).

Formato JSON:
${PLAN_JSON_SHAPE_HINT}
`;

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("A IA não retornou JSON válido");
  }
}

export type PlannerResult = {
  plan: StudioPlan;
  model: string;
  rawText: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
};

/**
 * Planner — depende apenas de LlmProvider (nunca importa Gemini diretamente).
 */
export async function runPlanner(
  provider: LlmProvider,
  input: {
    prompt: string;
    projectName?: string;
    projectSlug?: string;
  },
): Promise<PlannerResult> {
  const prompt = input.prompt.trim();
  if (prompt.length < 3) {
    throw new Error("Prompt muito curto");
  }

  const contextLines = [
    input.projectName ? `Nome do projeto atual: ${input.projectName}` : null,
    input.projectSlug ? `Slug: ${input.projectSlug}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const userContent = [
    contextLines || null,
    "Pedido do usuário:",
    prompt,
  ]
    .filter(Boolean)
    .join("\n\n");

  const skills = resolveSkills(prompt);

  const completion = await provider.complete({
    messages: [
      {
        role: "system",
        content: `${SYSTEM_PROMPT}\n\n═══ SKILLS X09 ATIVAS (${skills.ids.join(", ")}) ═══\n${skills.plannerAddon}`,
      },
      { role: "user", content: userContent },
    ],
    responseJsonSchema: { type: "object" },
    temperature: 0.35,
    maxOutputTokens: 8192,
  });

  const parsed = extractJsonObject(completion.text);
  const plan = ensureFullAppTasks(
    remapPlanPaths(
      studioPlanSchema.parse(normalizePlannerPayload(parsed)),
    ),
    input.prompt,
  );

  return {
    plan,
    model: completion.model,
    rawText: completion.text,
    usage: completion.usage,
  };
}

/** Garante App + Home + Login com instruções fortes (app completo). */
function ensureFullAppTasks(plan: StudioPlan, prompt: string): StudioPlan {
  const tasks = [...plan.tasks];
  const pathOf = (p: string) =>
    tasks.findIndex((t) => t.path?.replace(/\\/g, "/") === p);

  const ensureTask = (input: {
    id: string;
    path: string;
    title: string;
    instruction: string;
    dependsOn: string[];
    insertAt: number;
  }) => {
    const idx = pathOf(input.path);
    if (idx >= 0) {
      const current = tasks[idx]!;
      if (current.instruction.length < 100) {
        tasks[idx] = {
          ...current,
          instruction: `${current.instruction} — ${input.instruction}`,
        };
      }
      return current.id;
    }
    tasks.splice(input.insertAt, 0, {
      id: input.id,
      type: "update_file",
      title: input.title,
      instruction: input.instruction,
      path: input.path,
      dependsOn: input.dependsOn,
    });
    return input.id;
  };

  const appId = ensureTask({
    id: "t_app_nav",
    path: "src/App.tsx",
    title: needsDashboardApp(prompt)
      ? "App com Home + Login + Dashboard"
      : "App com navegação Home + Login",
    instruction: needsDashboardApp(prompt)
      ? "Reescreva App.tsx com useState home|login|app. Renderize HomePage, LoginPage e DashboardPage. SEM AppShell. Login navega para app após sucesso."
      : "Reescreva App.tsx com useState para páginas home|login. Renderize HomePage e LoginPage. SEM AppShell e SEM texto Meu App. Inclua forma de ir para login a partir da home (callback ou prop).",
    dependsOn: [],
    insertAt: 0,
  });

  const homeId = ensureTask({
    id: "t_home_full",
    path: "src/pages/HomePage.tsx",
    title: "Página principal completa",
    instruction: `Crie a página principal COMPLETA para: ${prompt.slice(0, 600)}. Use nome da empresa, cores, WhatsApp/telefone/e-mail/endereço/CRECI citados no pedido. Header com CTA Entrar, hero, 3+ seções, prova social/galeria, CTA final, footer. Textos reais — nunca fictícios. Aceite prop opcional onNavigateToLogin?.()`,
    dependsOn: [appId],
    insertAt: 1,
  });

  const loginId = ensureTask({
    id: "t_login_full",
    path: "src/pages/LoginPage.tsx",
    title: "Login e cadastro com Supabase Auth",
    instruction: `Tela de autenticação completa para: ${prompt.slice(0, 200)}. Toggle Entrar/Criar conta, email+senha, busy/error. Use getSupabase() de ../lib/supabase e chame auth.signInWithPassword / auth.signUp de verdade. Após sucesso, chame onNavigateApp?.() se existir, senão onNavigateHome?.(). Visual premium Tailwind. NÃO stub.`,
    dependsOn: [homeId],
    insertAt: 2,
  });

  if (needsDashboardApp(prompt)) {
    ensureTask({
      id: "t_dashboard_crud",
      path: "src/pages/DashboardPage.tsx",
      title: "Dashboard com CRUD",
      instruction: `Crie DashboardPage para: ${prompt.slice(0, 300)}. Layout com sidebar/topbar, título do produto, lista de registros (useState + getSupabase().from se houver tabela; senão estado local com mock inicial). Formulário para criar/editar (nome + campos relevantes), botões salvar/excluir, estados loading/empty/error. Após login o usuário cai aqui. Props: onNavigateHome?: () => void, onSignOut?: () => void. Português, UI densa e útil — NÃO página vazia.`,
      dependsOn: [loginId],
      insertAt: 3,
    });

    // Reforça App.tsx com rota dashboard
    const appIdx = pathOf("src/App.tsx");
    if (appIdx >= 0) {
      const current = tasks[appIdx]!;
      tasks[appIdx] = {
        ...current,
        title: "App com Home + Login + Dashboard",
        instruction: `${current.instruction} Inclua rota "app"/dashboard: após login bem-sucedido mostre DashboardPage. Import DashboardPage. Estados: home | login | app.`,
      };
    }
  }

  // Páginas do plano devem citar home + login (+ dashboard)
  const pages = [...plan.pages];
  if (!pages.some((p) => p.path === "/" || p.path === "/home")) {
    pages.unshift({
      path: "/",
      name: "Home",
      description: "Página principal do produto",
    });
  }
  if (!pages.some((p) => /login|entrar|auth/i.test(p.path) || /login|entrar/i.test(p.name))) {
    pages.push({
      path: "/login",
      name: "Login",
      description: "Entrar e criar conta",
    });
  }
  if (
    needsDashboardApp(prompt) &&
    !pages.some((p) => /dashboard|app|painel|admin/i.test(p.path) || /dashboard|painel/i.test(p.name))
  ) {
    pages.push({
      path: "/app",
      name: "Dashboard",
      description: "Área logada com CRUD",
    });
  }

  return { ...plan, pages, tasks: tasks.slice(0, 40) };
}

function needsDashboardApp(prompt: string): boolean {
  return /saas|crm|dashboard|painel|admin|gest[aã]o|backoffice|erp|sistema de|plataforma de|\bcrud\b|cadastro de|agenda|kanban|inbox|financeiro|assinatura|multi[- ]?tenant/i.test(
    prompt,
  );
}

/** Corrige paths Next.js → template Vite React. */
function remapPlanPaths(plan: StudioPlan): StudioPlan {
  return {
    ...plan,
    pages: plan.pages.map((page) => ({
      ...page,
      path:
        page.path === "/" || page.path === "/home"
          ? "/"
          : page.path.replace(/^\/app\//, "/"),
    })),
    tasks: plan.tasks.map((task) => {
      if (!task.path) return task;
      return { ...task, path: remapFilePath(task.path) };
    }),
  };
}

function remapFilePath(path: string): string {
  const p = path.replace(/\\/g, "/").replace(/^\.\//, "");
  if (
    p === "src/app/page.tsx" ||
    p === "app/page.tsx" ||
    p === "src/app/(marketing)/page.tsx"
  ) {
    return "src/pages/HomePage.tsx";
  }
  if (p.startsWith("src/app/") && p.endsWith("/page.tsx")) {
    const name = p.split("/").slice(-2, -1)[0] ?? "Page";
    const pascal = name
      .split("-")
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join("");
    return `src/pages/${pascal}Page.tsx`;
  }
  if (p === "src/app/layout.tsx" || p === "app/layout.tsx") {
    return "src/App.tsx";
  }
  if (p.startsWith("app/")) return `src/${p}`;
  return p;
}
