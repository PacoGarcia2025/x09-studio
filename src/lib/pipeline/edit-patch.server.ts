import "server-only";
import { z } from "zod";
import type { LlmProvider } from "@/lib/llm/types";
import {
  EDIT_PATCH_RULES,
  formatBuilderContext,
} from "@/lib/pipeline/brief-context";
import { resolveSkills } from "@/lib/skills/resolve";
import {
  assertValidTsxOrThrow,
  prepareTsxForProject,
} from "@/lib/pipeline/tsx-write-guard";
import { getTsxSyntaxIssues } from "@/lib/pipeline/jsx-validate";
import { LANDING_APP_TSX } from "@/lib/pipeline/task-content.server";
import {
  fileExists,
  listProjectTree,
  readProjectFile,
  writeProjectFile,
  type FileTreeNode,
} from "@/lib/projects/fs.server";

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

async function requestEditPatch(
  provider: LlmProvider,
  input: {
    projectName: string;
    briefPrompt?: string | null;
    message: string;
    fileBlocks: string[];
    syntaxRetryNote?: string;
  },
): Promise<{ patch: z.infer<typeof patchSchema>; model: string }> {
  const skillPrompt = [input.briefPrompt, input.message].filter(Boolean).join("\n");
  const skills = resolveSkills(skillPrompt);
  const editRules = skills.editPatchRules || EDIT_PATCH_RULES;

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
${editRules}`,
      },
      {
        role: "user",
        content: [
          formatBuilderContext({
            projectName: input.projectName,
            briefPrompt: input.briefPrompt,
            taskInstruction: `Pedido de edição: ${input.message}`,
          }),
          input.syntaxRetryNote,
          "Arquivos atuais:",
          input.fileBlocks.join("\n\n"),
        ]
          .filter(Boolean)
          .join("\n\n"),
      },
    ],
    responseJsonSchema: { type: "object" },
    temperature: 0.25,
    maxOutputTokens: 16384,
  });

  return {
    patch: patchSchema.parse(extractJson(completion.text)),
    model: completion.model,
  };
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
      `--- ${rel}\n\`\`\`\n${content.slice(0, 12000)}\n\`\`\``,
    );
  }

  let parsed: z.infer<typeof patchSchema> | null = null;
  let patchModel = "edit-patch";
  let syntaxRetryNote: string | undefined;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const result = await requestEditPatch(provider, {
      projectName: input.projectName,
      briefPrompt: input.briefPrompt,
      message: input.message,
      fileBlocks,
      syntaxRetryNote,
    });
    parsed = result.patch;
    patchModel = result.model;

    const invalid: string[] = [];
    for (const file of parsed.files) {
      const path = file.path.replace(/\\/g, "/").replace(/^\.\//, "");
      try {
        assertValidTsxOrThrow(path, file.content);
      } catch (err) {
        invalid.push(
          err instanceof Error ? err.message : `Inválido: ${path}`,
        );
      }
    }

    if (invalid.length === 0) break;

    syntaxRetryNote = `ERRO DE SINTAXE na tentativa anterior — corrija e reescreva os arquivos COMPLETOS:\n${invalid.join("\n")}`;
    if (attempt === 2) {
      throw new Error(
        `Não consegui aplicar a edição: ${invalid.slice(0, 2).join("; ")}`,
      );
    }
  }

  if (!parsed) {
    throw new Error("Falha ao gerar patch de edição");
  }

  const written: string[] = [];

  for (const file of parsed.files) {
    const path = file.path.replace(/\\/g, "/").replace(/^\.\//, "");
    if (path.includes("..") || path.startsWith("/")) {
      throw new Error(`Path inválido no patch: ${file.path}`);
    }

    const content = prepareTsxForProject(path, file.content);
    assertValidTsxOrThrow(path, content);

    await writeProjectFile(input.projectId, path, content);
    written.push(path);

    if (/pages\/HomePage\.tsx?$/i.test(path)) {
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
    model: patchModel,
  };
}

/** Valida TSX sem gravar — útil em testes. */
export function validatePatchFiles(
  files: Array<{ path: string; content: string }>,
): string[] {
  const issues: string[] = [];
  for (const file of files) {
    const path = file.path.replace(/\\/g, "/");
    issues.push(...getTsxSyntaxIssues(file.content, path).map((i) => `${path}: ${i}`));
  }
  return issues;
}
