import { z } from "zod";
import type { LlmProvider } from "@/lib/llm/types";
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
- Estrutura mínima (todas obrigatórias):
  1) Header sticky com nome da marca + 3 links âncora + botão CTA
  2) Hero full-width com headline forte, subtítulo, 2 CTAs, e bloco visual
  3) Seção de benefícios/serviços (3+ cards)
  4) Seção de prova social ou galeria (3+ itens)
  5) Seção CTA final
  6) Footer com contato
- O arquivo deve ter NO MÍNIMO ~80 linhas de JSX útil (não um único retângulo colorido).
- Cores: violeta/fúcsia (#7C3AED / #C026D3) como acento, tipografia forte, bom espaçamento.`;

const APP_TSX_SYSTEM = `Você gera src/App.tsx de um app Vite + React.
Responda APENAS JSON: { "content": string }.

Para landing page:
- NÃO use AppShell.
- NÃO mostre header "Meu App" / Início / Entrar.
- Apenas:
import { HomePage } from "./pages/HomePage";
export default function App() {
  return <HomePage />;
}
`;

/** Detecta landing fraca (template ou retângulo vazio). */
export function isWeakHomePage(content: string): boolean {
  const trimmed = content.trim();
  if (trimmed.length < 1500) return true;
  if (/Bem-vindo|Este app foi gerado pelo X09/i.test(trimmed)) return true;
  if (!/export\s+(function|const)\s+HomePage/.test(trimmed)) return true;
  const sectionCount = (trimmed.match(/<section\b/gi) ?? []).length;
  const headingCount = (trimmed.match(/<h[12]\b/gi) ?? []).length;
  if (sectionCount < 2 && headingCount < 2) return true;
  const words = trimmed.match(/[A-Za-zÀ-ÿ]{4,}/g) ?? [];
  if (words.length < 60) return true;
  return false;
}

function systemForPath(path: string): { system: string; maxTokens: number } {
  const p = path.replace(/\\/g, "/");
  if (p.endsWith("pages/HomePage.tsx") || p.endsWith("pages/HomePage.jsx")) {
    return { system: HOME_PAGE_SYSTEM, maxTokens: 12288 };
  }
  if (p.endsWith("App.tsx") || p.endsWith("App.jsx")) {
    return { system: APP_TSX_SYSTEM, maxTokens: 2048 };
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

      const isHome =
        /pages\/HomePage\.tsx?$/i.test(task.path.replace(/\\/g, "/"));
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

      return { kind: "file", content };
    }
    case "delete_file":
      return { kind: "delete" };
    case "run_command": {
      const parsed = commandPayloadSchema.parse(
        await completeJson(
          provider,
          `Responda APENAS JSON {"command":"..."}.
Comandos válidos: npm install, npm ci, npm run build, npm run typecheck, bun install, bun run build, bun run typecheck.
Prefira npm install se a task for instalar dependências.`,
          base,
          1024,
        ),
      );
      return { kind: "command", command: parsed.command };
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

/** App.tsx mínimo sem o chrome "Meu App". */
export const LANDING_APP_TSX = `import { HomePage } from "./pages/HomePage";

export default function App() {
  return <HomePage />;
}
`;
