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
): Promise<unknown> {
  const result = await provider.complete({
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    responseJsonSchema: { type: "object" },
    temperature: 0.25,
    maxOutputTokens: 8192,
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
- Se o path for src/pages/HomePage.tsx, entregue a landing completa (hero, seções, CTA) em JSX exportado.
- Código em TypeScript/React/CSS conforme o path.
- Seja completo para ESTE arquivo, mas curto (sem monólitos).`;

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
      const user = [
        base,
        task.type === "update_file" && context.existingFileContent != null
          ? `Arquivo atual:\n\`\`\`\n${context.existingFileContent.slice(0, 12000)}\n\`\`\``
          : null,
        'Retorne JSON {"content":"..."} com o arquivo completo.',
      ]
        .filter(Boolean)
        .join("\n\n");
      const parsed = filePayloadSchema.parse(
        await completeJson(provider, FILE_SYSTEM, user),
      );
      return { kind: "file", content: parsed.content };
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
