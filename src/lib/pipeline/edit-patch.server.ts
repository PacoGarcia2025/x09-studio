import "server-only";
import { z } from "zod";
import type { LlmProvider } from "@/lib/llm/types";
import {
  fileExists,
  listProjectTree,
  readProjectFile,
  writeProjectFile,
  type FileTreeNode,
} from "@/lib/projects/fs.server";
import { LANDING_APP_TSX } from "@/lib/pipeline/task-content.server";

const patchSchema = z.object({
  summary: z.string().min(1),
  files: z
    .array(
      z.object({
        path: z.string().min(1),
        content: z.string().min(1),
      }),
    )
    .min(1)
    .max(8),
});

function flattenFiles(nodes: FileTreeNode[], out: string[] = []): string[] {
  for (const node of nodes) {
    if (node.type === "directory" && node.children) {
      flattenFiles(node.children, out);
    } else if (node.type === "file" && /\.(tsx?|jsx?|css)$/i.test(node.path)) {
      out.push(node.path);
    }
  }
  return out;
}

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
    throw new Error("A IA não retornou JSON válido no patch");
  }
}

/**
 * Aplica edição cirúrgica: a IA recebe contexto dos arquivos e devolve
 * apenas os arquivos que precisam mudar (conteúdo completo).
 */
export async function applyChatEditPatch(
  provider: LlmProvider,
  input: {
    projectId: string;
    projectName: string;
    briefPrompt?: string | null;
    message: string;
  },
): Promise<{ summary: string; paths: string[]; model: string }> {
  const tree = await listProjectTree(input.projectId);
  const allPaths = flattenFiles(tree).slice(0, 40);

  const preferred = [
    "src/App.tsx",
    "src/pages/HomePage.tsx",
    "src/pages/LoginPage.tsx",
    "src/pages/DashboardPage.tsx",
    "src/index.css",
    "src/lib/supabase.ts",
  ].filter((p) => allPaths.includes(p));

  const contextPaths = [
    ...preferred,
    ...allPaths.filter((p) => !preferred.includes(p)),
  ].slice(0, 10);

  const fileBlocks: string[] = [];
  for (const rel of contextPaths) {
    if (!(await fileExists(input.projectId, rel))) continue;
    const content = await readProjectFile(input.projectId, rel);
    fileBlocks.push(
      `--- ${rel}\n\`\`\`\n${content.slice(0, 10000)}\n\`\`\``,
    );
  }

  const completion = await provider.complete({
    messages: [
      {
        role: "system",
        content: `Você é o editor cirúrgico do X09 Studio (Vite + React + TypeScript + Tailwind via className).
Responda APENAS JSON:
{
  "summary": string (1-2 frases do que mudou, em português),
  "files": [{ "path": string, "content": string }]
}

Regras:
- Altere SÓ o necessário para atender o pedido.
- Devolva o conteúdo COMPLETO de cada arquivo modificado (não diff).
- Paths relativos ao projeto (ex: src/pages/HomePage.tsx).
- Máximo 8 arquivos.
- NÃO use Next.js, NÃO use AppShell/"Meu App".
- Mantenha exports (HomePage, LoginPage) e props de navegação se existirem.
- Textos em português do Brasil, específicos — nunca Lorem/Bem-vindo genérico.
- Se precisar criar página nova, inclua o arquivo e atualize src/App.tsx.`,
      },
      {
        role: "user",
        content: [
          `Projeto: ${input.projectName}`,
          input.briefPrompt
            ? `Brief original: ${input.briefPrompt.slice(0, 500)}`
            : null,
          `Pedido de edição: ${input.message}`,
          "Arquivos atuais:",
          fileBlocks.join("\n\n"),
        ]
          .filter(Boolean)
          .join("\n\n"),
      },
    ],
    responseJsonSchema: { type: "object" },
    temperature: 0.3,
    maxOutputTokens: 12288,
  });

  const parsed = patchSchema.parse(extractJson(completion.text));
  const written: string[] = [];

  for (const file of parsed.files) {
    const path = file.path.replace(/\\/g, "/").replace(/^\.\//, "");
    if (path.includes("..") || path.startsWith("/")) {
      throw new Error(`Path inválido no patch: ${file.path}`);
    }
    await writeProjectFile(input.projectId, path, file.content);
    written.push(path);

    if (/pages\/HomePage\.tsx?$/i.test(path)) {
      // Garante navegação Home/Login se o patch não tocou App.tsx
      if (!written.some((p) => p.endsWith("App.tsx"))) {
        const appExists = await fileExists(input.projectId, "src/App.tsx");
        if (appExists) {
          const app = await readProjectFile(input.projectId, "src/App.tsx");
          if (!/LoginPage/.test(app)) {
            await writeProjectFile(
              input.projectId,
              "src/App.tsx",
              LANDING_APP_TSX,
            );
            written.push("src/App.tsx");
          }
        }
      }
    }
  }

  return {
    summary: parsed.summary,
    paths: written,
    model: completion.model,
  };
}
