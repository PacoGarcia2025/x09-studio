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
  - src/pages/HomePage.tsx  (página principal / landing — SEMPRE atualizar)
  - src/pages/LoginPage.tsx
  - src/components/AppShell.tsx
  - src/lib/supabase.ts
  - src/index.css
- Para landing page: a task principal DEVE ser update_file em src/pages/HomePage.tsx com hero, seções e CTA.
- Também atualize src/App.tsx se precisar remover o shell/login e mostrar só a Home.
- NÃO escreva código-fonte completo (sem componentes React longos, sem SQL completo de dezenas de linhas).
- Em "tasks.instruction", descreva O QUE fazer em 1–3 frases curtas. O Builder escreverá o código depois.
- tasks devem ser pequenas, ordenáveis e tipadas (create_file, update_file, delete_file, run_command, sql_migration, env_set).
- Entre 3 e 40 tasks. Preferir 8–20 para um CRM típico; 6–12 para landing page.
- Cada task precisa de "id" único (ex: "t1", "t2") e "dependsOn" com ids anteriores quando houver dependência.
- Inclua módulos, páginas, tabelas, APIs, auth e integrações relevantes ao pedido.
- database.tables, auth.providers e auth.roles DEVEM ser arrays (nunca null, nunca string solta).
- Mesmo em landing page sem login, use auth.providers: ["email"] e auth.roles: ["visitor"], e pelo menos 1 tabela (ex: contacts).
- Integrações: cite só o necessário (ex: Supabase). PIX/Asaas só se o pedido pedir pagamentos.

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
  const plan = remapPlanPaths(
    studioPlanSchema.parse(normalizePlannerPayload(parsed)),
  );

  return {
    plan,
    model: completion.model,
    rawText: completion.text,
    usage: completion.usage,
  };
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
