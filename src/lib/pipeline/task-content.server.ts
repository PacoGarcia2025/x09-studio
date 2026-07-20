import { z } from "zod";
import type { LlmProvider } from "@/lib/llm/types";
import { resolveCommandPlan } from "@/lib/pipeline/commands.allowlist";
import type { PlanTaskType } from "@/lib/pipeline/plan-schema";

const filePayloadSchema = z.object({
  content: z.string().min(1).max(120_000),
});

const commandPayloadSchema = z.object({
  command: z.string().min(1).max(200),
});

const envPayloadSchema = z.object({
  key: z
    .string()
    .regex(/^[A-Za-z_][A-Za-z0-9_]*$/, "chave env inválida"),
  value: z.string().max(4000),
});

const sqlPayloadSchema = z.object({
  filename: z
    .string()
    .regex(/^[a-z0-9_\-]+\.sql$/, "filename sql inválido"),
  content: z.string().min(1).max(80_000),
});

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("Resposta da IA não é JSON válido");
  }
}

async function completeJson(
  provider: LlmProvider,
  system: string,
  user: string,
  maxOutputTokens = 8192,
): Promise<unknown> {
  const result = await provider.complete({
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    responseJsonSchema: { type: "object" },
    temperature: 0.35,
    maxOutputTokens,
  });
  return extractJson(result.text);
}

const FILE_SYSTEM = `Você é o gerador de conteúdo de UMA única task do Builder X09 Studio.
Responda APENAS JSON: { "content": string }
- Gere só o conteúdo deste arquivo.
- Não gere outros arquivos.
- Não explique.
- Stack: Vite + React + TypeScript (NÃO Next.js).
- Use Tailwind via className (CDN no preview). Sem importar tailwindcss.
- NÃO use import.meta.env (quebra o preview Sandpack). Use getSupabase() para Supabase.
- Código em TypeScript/React/CSS conforme o path.`;

const HOME_PAGE_SYSTEM = `Você gera a HomePage completa de um app Vite + React + TypeScript.
Responda APENAS JSON: { "content": string } com o arquivo TSX inteiro.

Regras OBRIGATÓRIAS:
- export function HomePage() { ... } (named export).
- NÃO use AppShell, router, next/*, nem "Meu App".
- Landing visualmente rica, pronta para conversão, em português do Brasil.
- Use Tailwind (className). Sem importar CSS/tailwindcss.
- Pode usar lucide-react para ícones.
- Sem imagens remotas quebradas: use gradientes, placeholders com divs coloridas, ou https://images.unsplash.com com URLs reais.
- Conteúdo REAL (textos específicos do negócio do usuário), nunca "Lorem ipsum", nunca "Bem-vindo", nunca página vazia.
- Aceite prop opcional onNavigateToLogin?: () => void e use no CTA "Entrar".
- Estrutura mínima (todas obrigatórias):
  1) Header sticky com nome da marca + 3 links âncora + botão Entrar/CTA
  2) Hero full-width com headline forte, subtítulo, 2 CTAs, e bloco visual
  3) Seção de benefícios/serviços (3+ cards)
  4) Seção de prova social ou galeria (3+ itens)
  5) Seção CTA final
  6) Footer com contato
- O arquivo deve ter NO MÍNIMO ~80 linhas de JSX útil (não um único retângulo colorido).
- Cores: violeta/fúcsia (#7C3AED / #C026D3) como acento, tipografia forte, bom espaçamento.`;

const APP_TSX_SYSTEM = `Você gera src/App.tsx de um app Vite + React.
Responda APENAS JSON: { "content": string }.

Obrigatório:
- import { useState } from "react"
- import { HomePage } from "./pages/HomePage"
- import { LoginPage } from "./pages/LoginPage"
- Se a instrução citar Dashboard/app logado: import { DashboardPage } from "./pages/DashboardPage"
- Navegação useState<"home" | "login" | "app"> (use "app" só se houver Dashboard)
- HomePage: onNavigateToLogin={() => setPage("login")}
- LoginPage: onNavigateHome={() => setPage("home")} e onNavigateApp={() => setPage("app")} se houver Dashboard
- DashboardPage: onNavigateHome + onSignOut voltando para home/login
- NÃO use AppShell
- NÃO mostre header "Meu App" / Início / Entrar do template
`;

const LOGIN_PAGE_SYSTEM = `Você gera LoginPage completa (Vite + React + TypeScript + Supabase Auth).
Responda APENAS JSON: { "content": string }.

Regras:
- export function LoginPage({ onNavigateHome, onNavigateApp }: { onNavigateHome?: () => void; onNavigateApp?: () => void })
- import { getSupabase } from "../lib/supabase"
- UI premium Tailwind: card central, marca, toggle Entrar / Criar conta
- Campos email + senha, botão submit, estados busy/error/success (useState)
- No submit: supabase.auth.signInWithPassword ou signUp de verdade
- Após sucesso: onNavigateApp?.() ?? onNavigateHome?.()
- Link/botão "Voltar" chama onNavigateHome?.()
- Textos em português do Brasil, alinhados ao produto
- NUNCA deixe stub ("próximas sprints")
- Sem next/*, sem AppShell
`;

const DASHBOARD_PAGE_SYSTEM = `Você gera DashboardPage (área logada) Vite + React + TypeScript + Supabase.
Responda APENAS JSON: { "content": string }.

Regras:
- export function DashboardPage({ onNavigateHome, onSignOut }: { onNavigateHome?: () => void; onSignOut?: () => void })
- import { getSupabase } from "../lib/supabase" e useState/useEffect
- Layout: topbar ou sidebar com nome do produto, botão Sair, conteúdo principal
- CRUD útil: lista de itens + formulário criar/editar + excluir
- Preferir supabase.from("...") com select/insert/update/delete; se falhar, manter estado local com seed
- Estados: loading, empty, error, busy no submit
- UI densa Tailwind, textos em português específicos do domínio
- NÃO página vazia / "em breve" / stub
- Sem next/*, sem AppShell
`;

/** Detecta landing fraca (template ou retângulo vazio). */
export function isWeakHomePage(content: string): boolean {
  const trimmed = content.trim();
  if (trimmed.length < 1500) return true;
  if (/Bem-vindo|Este app foi gerado pelo X09|Lorem ipsum/i.test(trimmed))
    return true;
  if (!/export\s+(function|const)\s+HomePage/.test(trimmed)) return true;
  const sectionCount = (trimmed.match(/<section\b/gi) ?? []).length;
  const headingCount = (trimmed.match(/<h[12]\b/gi) ?? []).length;
  if (sectionCount < 2 && headingCount < 2) return true;
  const words = trimmed.match(/[A-Za-zÀ-ÿ]{4,}/g) ?? [];
  if (words.length < 60) return true;
  return false;
}

export function isWeakLoginPage(content: string): boolean {
  const trimmed = content.trim();
  if (trimmed.length < 800) return true;
  if (/próximas sprints|Auth Supabase será configurado/i.test(trimmed))
    return true;
  if (!/export\s+(function|const)\s+LoginPage/.test(trimmed)) return true;
  if (!/email/i.test(trimmed) || !/password|senha/i.test(trimmed)) return true;
  if (
    !/getSupabase|signInWithPassword|signUp/.test(trimmed) &&
    !/supabase\.auth/.test(trimmed)
  ) {
    return true;
  }
  return false;
}

export function isWeakDashboardPage(content: string): boolean {
  const trimmed = content.trim();
  if (trimmed.length < 1200) return true;
  if (/em breve|próximas sprints|coming soon|placeholder/i.test(trimmed))
    return true;
  if (!/export\s+(function|const)\s+DashboardPage/.test(trimmed)) return true;
  if (!/useState/.test(trimmed)) return true;
  if (!/onChange|onSubmit|insert|from\(|map\(/.test(trimmed)) return true;
  return false;
}

function systemForPath(path: string): { system: string; maxTokens: number } {
  const p = path.replace(/\\/g, "/");
  if (p.endsWith("pages/HomePage.tsx") || p.endsWith("pages/HomePage.jsx")) {
    return { system: HOME_PAGE_SYSTEM, maxTokens: 12288 };
  }
  if (p.endsWith("pages/LoginPage.tsx") || p.endsWith("pages/LoginPage.jsx")) {
    return { system: LOGIN_PAGE_SYSTEM, maxTokens: 8192 };
  }
  if (
    p.endsWith("pages/DashboardPage.tsx") ||
    p.endsWith("pages/DashboardPage.jsx")
  ) {
    return { system: DASHBOARD_PAGE_SYSTEM, maxTokens: 12288 };
  }
  if (p.endsWith("App.tsx") || p.endsWith("App.jsx")) {
    return { system: APP_TSX_SYSTEM, maxTokens: 4096 };
  }
  return { system: FILE_SYSTEM, maxTokens: 8192 };
}

/**
 * Gera o payload tipado da task via LlmProvider (nunca importa Gemini).
 */
export async function generateTaskPayload(
  provider: LlmProvider,
  task: {
    type: PlanTaskType;
    title: string;
    instruction: string;
    path?: string | null;
  },
  context: {
    projectName: string;
    existingFileContent?: string | null;
  },
): Promise<
  | { kind: "file"; content: string }
  | { kind: "command"; command: string }
  | { kind: "env"; key: string; value: string }
  | { kind: "sql"; filename: string; content: string }
  | { kind: "delete" }
> {
  const base = [
    `Projeto: ${context.projectName}`,
    `Task: ${task.title}`,
    `Tipo: ${task.type}`,
    `Instrução: ${task.instruction}`,
    task.path ? `Path: ${task.path}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  switch (task.type) {
    case "create_file":
    case "update_file": {
      if (!task.path) throw new Error("Task de arquivo exige path");
      const { system, maxTokens } = systemForPath(task.path);
      const user = [
        base,
        task.type === "update_file" && context.existingFileContent != null
          ? `Arquivo atual (pode ignorar se for template fraco):\n\`\`\`\n${context.existingFileContent.slice(0, 4000)}\n\`\`\``
          : null,
        'Retorne JSON {"content":"..."} com o arquivo completo.',
      ]
        .filter(Boolean)
        .join("\n\n");

      let content = filePayloadSchema.parse(
        await completeJson(provider, system, user, maxTokens),
      ).content;

      const normalizedPath = task.path.replace(/\\/g, "/");
      const isHome = /pages\/HomePage\.tsx?$/i.test(normalizedPath);
      const isLogin = /pages\/LoginPage\.tsx?$/i.test(normalizedPath);
      const isDashboard = /pages\/DashboardPage\.tsx?$/i.test(normalizedPath);

      if (isHome && isWeakHomePage(content)) {
        const retryUser = [
          base,
          "A versão anterior ficou FRACA (quase vazia). Reescreva a landing COMPLETA com hero, 3+ seções, textos reais e CTAs.",
          'Retorne JSON {"content":"..."} com HomePage.tsx completo e denso.',
        ].join("\n\n");
        content = filePayloadSchema.parse(
          await completeJson(provider, HOME_PAGE_SYSTEM, retryUser, 12288),
        ).content;
      }

      if (isLogin && isWeakLoginPage(content)) {
        const retryUser = [
          base,
          "A versão anterior é stub/fraca. Reescreva LoginPage COMPLETA com getSupabase().auth (signInWithPassword/signUp), email, senha, toggle cadastro e visual premium.",
          'Retorne JSON {"content":"..."} .',
        ].join("\n\n");
        content = filePayloadSchema.parse(
          await completeJson(provider, LOGIN_PAGE_SYSTEM, retryUser, 8192),
        ).content;
      }

      if (isDashboard && isWeakDashboardPage(content)) {
        const retryUser = [
          base,
          "A versão anterior é fraca/vazia. Reescreva DashboardPage COM lista + formulário CRUD + loading/empty, usando getSupabase() quando possível.",
          'Retorne JSON {"content":"..."} .',
        ].join("\n\n");
        content = filePayloadSchema.parse(
          await completeJson(provider, DASHBOARD_PAGE_SYSTEM, retryUser, 12288),
        ).content;
      }

      return { kind: "file", content };
    }
    case "delete_file":
      return { kind: "delete" };
    case "run_command": {
      const parsed = commandPayloadSchema.parse(
        await completeJson(
          provider,
          `Responda APENAS JSON {"command":"..."}.
Comando ÚNICO. Preferir "npm install" se precisar instalar deps.
NÃO use: migrate, build, typecheck, preview (o Studio previewa via Sandpack).
Se a task não precisar instalar nada, use "npm install" mesmo assim ou a instrução será ignorada com segurança.`,
          base,
          1024,
        ),
      );
      const plan = resolveCommandPlan(parsed.command);
      const command = plan.run[0] ?? "npm install";
      return { kind: "command", command };
    }
    case "env_set": {
      const parsed = envPayloadSchema.parse(
        await completeJson(
          provider,
          'Responda APENAS JSON {"key":"VAR","value":"..."}. Use placeholders se for segredo.',
          base,
          1024,
        ),
      );
      return { kind: "env", key: parsed.key, value: parsed.value };
    }
    case "sql_migration": {
      const parsed = sqlPayloadSchema.parse(
        await completeJson(
          provider,
          'Responda APENAS JSON {"filename":"nome_curto.sql","content":"-- sql..."}. filename sem timestamp.',
          base,
          4096,
        ),
      );
      return {
        kind: "sql",
        filename: parsed.filename,
        content: parsed.content,
      };
    }
    default: {
      const _x: never = task.type;
      throw new Error(`Tipo não suportado: ${_x}`);
    }
  }
}

/** App.tsx com Home + Login + Dashboard (sem chrome Meu App). */
export const LANDING_APP_TSX = `import { useState } from "react";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";

type Page = "home" | "login" | "app";

export default function App() {
  const [page, setPage] = useState<Page>("home");

  if (page === "login") {
    return (
      <LoginPage
        onNavigateHome={() => setPage("home")}
        onNavigateApp={() => setPage("app")}
      />
    );
  }

  if (page === "app") {
    return (
      <DashboardPage
        onNavigateHome={() => setPage("home")}
        onSignOut={() => setPage("home")}
      />
    );
  }

  return <HomePage onNavigateToLogin={() => setPage("login")} />;
}
`;

/** Fallback se o projeto antigo não tiver DashboardPage.tsx */
export const MINIMAL_DASHBOARD_PAGE_TSX = `import { FormEvent, useState } from "react";

type Item = { id: string; title: string };

export function DashboardPage({
  onNavigateHome,
  onSignOut,
}: {
  onNavigateHome?: () => void;
  onSignOut?: () => void;
}) {
  const [items, setItems] = useState<Item[]>([
    { id: "1", title: "Primeiro item" },
  ]);
  const [title, setTitle] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setItems((prev) => [{ id: crypto.randomUUID(), title: title.trim() }, ...prev]);
    setTitle("");
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900">Dashboard</h1>
        <div className="flex gap-2">
          <button type="button" onClick={() => onNavigateHome?.()} className="text-sm text-zinc-600">Site</button>
          <button type="button" onClick={() => onSignOut?.()} className="rounded-full bg-zinc-900 px-3 py-1.5 text-sm text-white">Sair</button>
        </div>
      </header>
      <form onSubmit={onSubmit} className="mb-6 flex gap-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="flex-1 rounded-xl border border-zinc-200 px-3 py-2" placeholder="Novo item" />
        <button type="submit" className="rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white">Adicionar</button>
      </form>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="rounded-xl bg-white px-4 py-3 ring-1 ring-zinc-200">{item.title}</li>
        ))}
      </ul>
    </div>
  );
}
`;
