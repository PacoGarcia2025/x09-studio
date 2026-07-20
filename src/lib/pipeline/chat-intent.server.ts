import type { LlmProvider } from "@/lib/llm/types";

export type ChatIntent = "create" | "edit" | "ask";

/**
 * Classifica a mensagem do chat: criar app novo, editar o existente, ou só perguntar.
 */
export async function classifyChatIntent(
  provider: LlmProvider,
  input: {
    message: string;
    hasExistingApp: boolean;
    projectName: string;
  },
): Promise<ChatIntent> {
  const message = input.message.trim();
  if (!input.hasExistingApp) return "create";

  // Heurística rápida (sem LLM) para casos óbvios
  if (
    /^(o que|qual|como|por que|porque|explique|me diga|quantos)\b/i.test(
      message,
    ) &&
    message.length < 120 &&
    !/(mude|altere|troque|adicione|remova|crie|gere|faça|refaça)/i.test(message)
  ) {
    return "ask";
  }

  if (
    /(mude|altera|troque|adicione|remova|ajuste|corrija|melhore|deixe|torne|atualize|refatore)\b/i.test(
      message,
    ) ||
    /(cor|botão|botao|título|titulo|fonte|seção|secao|login|hero|footer|header)/i.test(
      message,
    )
  ) {
    return "edit";
  }

  if (
    /(crie (um|uma) (novo|nova)|do zero|recomece|outra landing|outro app|refaça (tudo|o app|a landing) completa)/i.test(
      message,
    )
  ) {
    return "create";
  }

  try {
    const result = await provider.complete({
      messages: [
        {
          role: "system",
          content: `Classifique a intenção do usuário para o editor X09 Studio.
Responda APENAS JSON: {"intent":"create"|"edit"|"ask"}
- create: gerar app/plano novo (ou refazer tudo)
- edit: alterar arquivos do app já existente (texto, cor, seção, login, etc.)
- ask: só pergunta, sem mudar código
Projeto atual: ${input.projectName}. Já existe app gerado: sim.`,
        },
        { role: "user", content: message },
      ],
      responseJsonSchema: { type: "object" },
      temperature: 0,
      maxOutputTokens: 64,
    });

    const match = result.text.match(/"intent"\s*:\s*"(create|edit|ask)"/);
    if (match?.[1] === "create" || match?.[1] === "edit" || match?.[1] === "ask") {
      return match[1];
    }
  } catch {
    // fallback abaixo
  }

  return "edit";
}
