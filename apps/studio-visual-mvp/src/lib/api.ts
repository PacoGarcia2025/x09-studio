import { useUserStore } from "@/store/user-store";

export type ApiChatMessage = {
  role: "user" | "ai" | "assistant" | "system";
  content: string;
};

export const SYSTEM_PROMPT = `Você é o X09 Studio, um Engenheiro Front-end e Diretor de Arte focado em UI/UX de altíssimo padrão.

PACOTES DISPONÍVEIS E OBRIGATÓRIOS:
1. 'lucide-react': USE ABUNDANTEMENTE para ilustrar serviços, botões e contatos. Nunca deixe um card sem ícone. (ex: import { Rocket, Zap } from 'lucide-react').
2. 'framer-motion': Use para animar TUDO (fade-in, slide-up, stagger nos cards).

RECEITAS DE DESIGN OBRIGATÓRIAS (USE EXATAMENTE ESTAS CLASSES TAILWIND):
- Fundo Principal: Fundo muito escuro com brilho sutil. Ex: 'min-h-screen bg-zinc-950 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))] text-white'
- Cards Premium (Glassmorphism): 'bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:bg-zinc-900/80 transition-all duration-300'
- Botões: 'bg-white text-black px-6 py-3 rounded-full font-semibold hover:scale-105 transition-transform flex items-center gap-2'
- Tipografia: Títulos muito grandes 'text-5xl md:text-7xl font-bold tracking-tighter'. Textos de apoio em 'text-zinc-400'.

REGRAS GERAIS:
- Layouts assimétricos (Bento Grid) são melhores que grids perfeitos 3x3.
- NUNCA use placeholder de imagens (loremflickr). Ilustre as seções com tipografia gigante e ícones do lucide-react.
- Todo texto gerado deve ser em Português (pt-BR).

REGRAS DE CÓDIGO:
- Apenas um arquivo path="/App.tsx".
- Responda apenas com o bloco Markdown \`\`\`tsx path="/App.tsx"
`;

function mapToOpenRouterRole(
  role: ApiChatMessage["role"],
): "system" | "user" | "assistant" {
  if (role === "ai" || role === "assistant") return "assistant";
  if (role === "system") return "system";
  return "user";
}

function buildUserContext(): string {
  const profile = useUserStore.getState();
  const hasProfile = Boolean(
    profile.name.trim() ||
      profile.email.trim() ||
      profile.whatsapp.trim() ||
      profile.instagram.trim() ||
      profile.logoUrl.trim(),
  );

  if (!hasProfile) return "";

  return `\n\n=== DADOS REAIS DO CLIENTE ===
Você DEVE utilizar as informações abaixo sempre que for criar um Header, Footer ou seção de Contato:
- Nome/Empresa: ${profile.name || "Não informado"}
- Email: ${profile.email || "Não informado"}
- WhatsApp: ${profile.whatsapp || "Não informado"}
- Instagram: ${profile.instagram || "Não informado"}
- URL da Logo: ${profile.logoUrl || "Não informado"}

Se a URL da Logo for fornecida, use-a na tag <img> do Header no lugar de um texto ou ícone genérico.`;
}

/**
 * Streaming real via OpenRouter (Claude 3.5 Sonnet).
 */
export async function streamAIResponse(
  onChunk: (text: string) => void,
  onFinish: (text: string) => void,
  messages: ApiChatMessage[],
): Promise<void> {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY as string | undefined;

  if (!apiKey || apiKey.includes("sua-chave-aqui")) {
    const errorText =
      "Configure `VITE_OPENROUTER_API_KEY` no arquivo `.env.local` e reinicie o `npm run dev`.";
    onChunk(errorText);
    onFinish(errorText);
    return;
  }

  let accumulated = "";

  try {
    const userContext = buildUserContext();
    const systemPromptWithProfile = SYSTEM_PROMPT + userContext;

    const formattedMessages = messages
      .filter((message) => message.content.trim().length > 0)
      .map((msg) => ({ ...msg }));
    const lastIndex = formattedMessages.length - 1;

    if (lastIndex >= 0 && formattedMessages[lastIndex]!.role === "user") {
      formattedMessages[lastIndex]!.content +=
        "\n\n[Regras Estritas do Sistema]\n" +
        "1) TODO o texto da interface e da resposta em português do Brasil (pt-BR).\n" +
        "2) Use lucide-react e framer-motion. PROIBIDO loremflickr/placeholders de imagem — tipografia gigante + ícones.\n" +
        "3) Use as classes Tailwind do system prompt (fundo zinc-950, cards glass, botões rounded-full).\n" +
        '4) Responda só com o bloco ```tsx path="/App.tsx"```.\n' +
        "5) Se houver DADOS REAIS DO CLIENTE no system prompt, use-os no Header, Footer e Contato.";
    }

    const payloadMessages = [
      { role: "system" as const, content: systemPromptWithProfile },
      ...formattedMessages.map((message) => ({
        role: mapToOpenRouterRole(message.role),
        content: message.content,
      })),
    ];

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "http://localhost:5173",
        "X-Title": "x09 Studio",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o",
        stream: true,
        messages: payloadMessages,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      const errorText = `Erro OpenRouter (${response.status}): ${errorBody || response.statusText}`;
      onChunk(errorText);
      onFinish(errorText);
      return;
    }

    if (!response.body) {
      const errorText = "A resposta da OpenRouter não incluiu um corpo com stream.";
      onChunk(errorText);
      onFinish(errorText);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || !line.startsWith("data:")) continue;

        const data = line.slice(5).trim();
        if (!data || data === "[DONE]") continue;

        try {
          const parsed = JSON.parse(data) as {
            choices?: Array<{ delta?: { content?: string } }>;
          };
          const delta = parsed.choices?.[0]?.delta?.content;
          if (!delta) continue;

          accumulated += delta;
          onChunk(accumulated);
        } catch {
          // Ignora chunks SSE incompletos/inválidos
        }
      }
    }

    onFinish(accumulated);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha desconhecida no streaming.";
    const errorText = `Falha ao conectar na OpenRouter: ${message}`;
    onChunk(accumulated || errorText);
    onFinish(accumulated || errorText);
  }
}
