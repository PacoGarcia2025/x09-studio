import type { LlmProvider } from "@/lib/llm/types";
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
  - src/pages/LoginPage.tsx (login/signup — SEMPRE)
  - src/lib/supabase.ts
  - src/index.css
- App COMPLETO (não só uma página):
  - Task #1: update_file src/App.tsx — navegação Home + Login (useState), SEM AppShell, SEM "Meu App".
  - Task #2: update_file src/pages/HomePage.tsx — página principal COMPLETA com copy real do negócio.
  - Task #3: update_file src/pages/LoginPage.tsx — tela de login/cadastro completa (email, senha, CTA, link voltar).
  - Se for SaaS/CRM/dashboard: inclua também DashboardPage ou equivalente.
  - Evite tasks de migrate/build/typecheck.
- NÃO escreva o código-fonte completo no JSON do plano (só instruções).
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

  const completion = await provider.complete({
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
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
    title: "App com navegação Home + Login",
    instruction:
      "Reescreva App.tsx com useState para páginas home|login. Renderize HomePage e LoginPage. SEM AppShell e SEM texto Meu App. Inclua forma de ir para login a partir da home (callback ou prop).",
    dependsOn: [],
    insertAt: 0,
  });

  const homeId = ensureTask({
    id: "t_home_full",
    path: "src/pages/HomePage.tsx",
    title: "Página principal completa",
    instruction: `Crie a página principal COMPLETA para: ${prompt.slice(0, 350)}. Header com CTA Entrar, hero, 3+ seções, prova social/galeria, CTA final, footer. Textos reais do negócio. Aceite prop opcional onNavigateToLogin?.()`,
    dependsOn: [appId],
    insertAt: 1,
  });

  ensureTask({
    id: "t_login_full",
    path: "src/pages/LoginPage.tsx",
    title: "Login e cadastro completos",
    instruction: `Tela de autenticação completa alinhada ao produto (${prompt.slice(0, 200)}). Tabs ou toggle Entrar/Criar conta, campos email e senha, validação visual, botão submit, link voltar para home via onNavigateHome?.(). Visual premium com Tailwind. NÃO deixe stub.`,
    dependsOn: [homeId],
    insertAt: 2,
  });

  // Páginas do plano devem citar home + login
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

  return { ...plan, pages, tasks: tasks.slice(0, 40) };
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
