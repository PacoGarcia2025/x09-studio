import { z } from "zod";
import type { LlmProvider } from "@/lib/llm/types";
import { resolveCommandPlan } from "@/lib/pipeline/commands.allowlist";
import type { PlanTaskType } from "@/lib/pipeline/plan-schema";
import { formatBuilderContext } from "@/lib/pipeline/brief-context";
import { isImobiliaria360 } from "@/lib/skills/detect";
import { resolveSkills } from "@/lib/skills/resolve";
import { lacksPremiumQuality } from "@/lib/skills/premium-design";
import {
  getTsxSyntaxIssues,
  hasValidTsxSyntax,
  isTsxPath,
} from "@/lib/pipeline/jsx-validate";

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

function skillPromptForPath(
  path: string,
  prompt: string,
): { system: string; maxTokens: number } {
  const skills = resolveSkills(prompt);
  const p = path.replace(/\\/g, "/");

  if (p.endsWith("pages/HomePage.tsx") || p.endsWith("pages/HomePage.jsx")) {
    return { system: skills.homePageSystem, maxTokens: 16384 };
  }
  if (p.endsWith("pages/ListingsPage.tsx")) {
    return { system: skills.listingsPageSystem, maxTokens: 16384 };
  }
  if (p.endsWith("pages/PropertyDetailPage.tsx")) {
    return { system: skills.propertyDetailPageSystem, maxTokens: 16384 };
  }
  if (p.endsWith("pages/BrokerDashboardPage.tsx")) {
    return { system: skills.brokerDashboardPageSystem, maxTokens: 16384 };
  }
  if (p.endsWith("pages/OwnerPortalPage.tsx")) {
    return { system: skills.ownerPortalPageSystem, maxTokens: 12288 };
  }
  if (p.endsWith("pages/AdminDashboardPage.tsx")) {
    return { system: skills.adminDashboardPageSystem, maxTokens: 12288 };
  }
  if (p.endsWith("lib/properties.ts")) {
    return { system: skills.propertiesLibSystem, maxTokens: 8192 };
  }
  if (p.endsWith("pages/LoginPage.tsx") || p.endsWith("pages/LoginPage.jsx")) {
    return { system: skills.loginPageSystem, maxTokens: 10240 };
  }
  if (
    p.endsWith("pages/DashboardPage.tsx") ||
    p.endsWith("pages/DashboardPage.jsx")
  ) {
    return { system: skills.dashboardPageSystem, maxTokens: 16384 };
  }
  if (p.endsWith("App.tsx") || p.endsWith("App.jsx")) {
    return { system: skills.appTsxRules, maxTokens: 6144 };
  }
  return { system: skills.fileSystemBase, maxTokens: 8192 };
}

/** Detecta landing fraca (abaixo do padrão premium). */
export function isWeakHomePage(content: string, brief = ""): boolean {
  const trimmed = content.trim();
  if (trimmed.length < 2000) return true;
  if (/Bem-vindo|Este app foi gerado pelo X09|Lorem ipsum/i.test(trimmed))
    return true;
  if (!/export\s+(function|const)\s+HomePage/.test(trimmed)) return true;
  if (lacksPremiumQuality(trimmed, brief).length > 0) return true;
  const words = trimmed.match(/[A-Za-zÀ-ÿ]{4,}/g) ?? [];
  if (words.length < 80) return true;
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
  if (trimmed.length < 1500) return true;
  if (/em breve|próximas sprints|coming soon|placeholder/i.test(trimmed))
    return true;
  if (!/export\s+(function|const)\s+DashboardPage/.test(trimmed)) return true;
  if (!/useState/.test(trimmed)) return true;
  if (!/onChange|onSubmit|insert|from\(|map\(/.test(trimmed)) return true;
  return false;
}

function systemForPath(
  path: string,
  skillPrompt: string,
): { system: string; maxTokens: number } {
  return skillPromptForPath(path, skillPrompt);
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
    briefPrompt?: string | null;
    existingFileContent?: string | null;
  },
): Promise<
  | { kind: "file"; content: string }
  | { kind: "command"; command: string }
  | { kind: "env"; key: string; value: string }
  | { kind: "sql"; filename: string; content: string }
  | { kind: "delete" }
> {
  const base = formatBuilderContext({
    projectName: context.projectName,
    briefPrompt: context.briefPrompt,
    taskInstruction: [
      `Task: ${task.title}`,
      `Tipo: ${task.type}`,
      task.path ? `Path: ${task.path}` : null,
      task.instruction,
    ]
      .filter(Boolean)
      .join("\n"),
  });

  const skillPrompt = [context.briefPrompt, task.instruction]
    .filter(Boolean)
    .join("\n");
  const skills = resolveSkills(skillPrompt);

  switch (task.type) {
    case "create_file":
    case "update_file": {
      if (!task.path) throw new Error("Task de arquivo exige path");
      const { system, maxTokens } = systemForPath(task.path, skillPrompt);
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

      if (isHome && isWeakHomePage(content, skillPrompt)) {
        const retryUser = [
          base,
          "REJEITADO: abaixo do padrão premium (R$20k). Reescreva HomePage COMPLETA: framer-motion, 5+ seções, copy real do brief, CTAs com cor de marca.",
          `Falhas detectadas: ${lacksPremiumQuality(content, skillPrompt).join("; ") || "conteúdo raso"}`,
          'Retorne JSON {"content":"..."} com HomePage.tsx completo.',
        ].join("\n\n");
        content = filePayloadSchema.parse(
          await completeJson(provider, skills.homePageSystem, retryUser, 16384),
        ).content;
      }

      if (isLogin && isWeakLoginPage(content)) {
        const retryUser = [
          base,
          "A versão anterior é stub/fraca. Reescreva LoginPage COMPLETA com getSupabase().auth (signInWithPassword/signUp), email, senha, toggle cadastro e visual premium cinematográfico.",
          'Retorne JSON {"content":"..."} .',
        ].join("\n\n");
        content = filePayloadSchema.parse(
          await completeJson(provider, skills.loginPageSystem, retryUser, 10240),
        ).content;
      }

      if (isDashboard && isWeakDashboardPage(content)) {
        const retryUser = [
          base,
          "A versão anterior é fraca. Reescreva DashboardPage premium COM KPIs, lista CRUD, formulário, loading/empty/error, getSupabase() quando possível.",
          'Retorne JSON {"content":"..."} .',
        ].join("\n\n");
        content = filePayloadSchema.parse(
          await completeJson(provider, skills.dashboardPageSystem, retryUser, 16384),
        ).content;
      }

      if (isTsxPath(normalizedPath)) {
        for (let attempt = 0; attempt < 2 && !hasValidTsxSyntax(content, normalizedPath); attempt += 1) {
          const syntaxIssues = getTsxSyntaxIssues(content, normalizedPath);
          const retryUser = [
            base,
            `ERRO DE SINTAXE no arquivo gerado: ${syntaxIssues.join("; ")}`,
            "Reescreva o arquivo TSX COMPLETO do zero. Feche todas as tags JSX e strings. Não trunque no final.",
            'Retorne JSON {"content":"..."} com o arquivo inteiro e válido.',
          ].join("\n\n");
          content = filePayloadSchema.parse(
            await completeJson(provider, system, retryUser, maxTokens),
          ).content;
        }

        if (!hasValidTsxSyntax(content, normalizedPath)) {
          const syntaxIssues = getTsxSyntaxIssues(content, normalizedPath);
          throw new Error(
            `Sintaxe TSX inválida em ${normalizedPath}: ${syntaxIssues.join("; ")}`,
          );
        }
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

/** App.tsx multi-página imobiliária 360°. */
export const IMOBILIARIA_APP_TSX = `import { useState } from "react";
import { HomePage } from "./pages/HomePage";
import { ListingsPage } from "./pages/ListingsPage";
import { PropertyDetailPage } from "./pages/PropertyDetailPage";
import { LoginPage } from "./pages/LoginPage";
import { BrokerDashboardPage } from "./pages/BrokerDashboardPage";
import { OwnerPortalPage } from "./pages/OwnerPortalPage";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";

type Page = "home" | "listings" | "property" | "login" | "broker" | "owner" | "admin";

export default function App() {
  const [page, setPage] = useState<Page>("home");
  const [propertyId, setPropertyId] = useState<string>("1");

  if (page === "login") {
    return (
      <LoginPage
        onNavigateHome={() => setPage("home")}
        onNavigateApp={() => setPage("broker")}
      />
    );
  }

  if (page === "broker") {
    return (
      <BrokerDashboardPage
        onNavigateHome={() => setPage("home")}
        onSignOut={() => setPage("home")}
      />
    );
  }

  if (page === "owner") {
    return (
      <OwnerPortalPage
        onNavigateHome={() => setPage("home")}
        onSignOut={() => setPage("home")}
      />
    );
  }

  if (page === "admin") {
    return (
      <AdminDashboardPage
        onNavigateHome={() => setPage("home")}
        onSignOut={() => setPage("home")}
      />
    );
  }

  if (page === "listings") {
    return (
      <ListingsPage
        onNavigateHome={() => setPage("home")}
        onSelectProperty={(id) => {
          setPropertyId(id);
          setPage("property");
        }}
      />
    );
  }

  if (page === "property") {
    return (
      <PropertyDetailPage
        propertyId={propertyId}
        onNavigateBack={() => setPage("listings")}
        onNavigateListings={() => setPage("listings")}
      />
    );
  }

  return (
    <HomePage
      onNavigateToLogin={() => setPage("login")}
      onNavigateListings={() => setPage("listings")}
      onSelectProperty={(id) => {
        setPropertyId(id);
        setPage("property");
      }}
    />
  );
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
