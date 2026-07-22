import type { LlmProvider } from "@/lib/llm/types";

export type ChatIntent = "create" | "edit" | "ask" | "resume_build";

/** Pedido para retomar geração interrompida (não é edição de código). */
export function isResumeBuildMessage(message: string): boolean {
  const m = message.trim();
  if (!m) return false;

  if (
    /\b(onde parou|de onde parou|where (you )?left off)\b/i.test(m) &&
    /\b(continue|continuar|retomar|retome|prossiga|seguir)\b/i.test(m)
  ) {
    return true;
  }

  if (
    /\b(continu(e|ar)|retom(e|ar)|prossig(a|ir)|seguir)\b.*\b(gera(ç|c)ão|build|site|app|projeto|preview|constru)/i.test(
      m,
    )
  ) {
    return true;
  }

  if (
    /\b(gera(ç|c)ão|build|constru).*\b(continu|retom|conclu|finaliz|termin)/i.test(
      m,
    )
  ) {
    return true;
  }

  return (
    /\bcontinuar (de )?onde parou\b/i.test(m) ||
    /\bretomar (a )?geração\b/i.test(m) ||
    /\btermin(ar|e) (de )?gerar\b/i.test(m) ||
    /\bfaltou (gerar|construir|terminar)\b/i.test(m)
  );
}

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

  if (isResumeBuildMessage(message)) {
    return "resume_build";
  }

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
Responda APENAS JSON: {"intent":"create"|"edit"|"ask"|"resume_build"}
- create: gerar app/plano novo (ou refazer tudo)
- edit: alterar arquivos do app já existente (texto, cor, seção, login, etc.)
- ask: só pergunta, sem mudar código
- resume_build: continuar/retomar geração interrompida ("continue de onde parou", "retomar build", etc.) — NÃO é edit
Projeto atual: ${input.projectName}. Já existe app gerado: sim.`,
        },
        { role: "user", content: message },
      ],
      responseJsonSchema: { type: "object" },
      temperature: 0,
      maxOutputTokens: 64,
    });

    const match = result.text.match(/"intent"\s*:\s*"(create|edit|ask|resume_build)"/);
    if (
      match?.[1] === "create" ||
      match?.[1] === "edit" ||
      match?.[1] === "ask" ||
      match?.[1] === "resume_build"
    ) {
      return match[1];
    }
  } catch {
    // fallback abaixo
  }

  return "edit";
}
