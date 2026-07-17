import { useUserStore } from "@/store/user-store";

export type ApiChatMessage = {
  role: "user" | "ai" | "assistant" | "system";
  content: string;
};

export const SYSTEM_PROMPT = `Você é o X09 Studio, um Engenheiro Front-end Sênior e Diretor de Arte focado em prêmios do Awwwards.
Sua inspiração são sites de altíssimo padrão como Apple, Linear, Vercel e Stripe.

IDIOMA: TODO texto visível na UI e toda a sua resposta em português do Brasil (pt-BR).

REGRAS DE DESIGN (ESTRITAMENTE OBRIGATÓRIO):
1. PROIBIDO DESIGN AMADOR: NUNCA use gradientes berrantes (ex: roxo para rosa forte), layouts de 3 colunas genéricos ou fundos brancos chapados. 
2. ESTÉTICA DARK PREMIUM: Use "Dark Mode" por padrão (fundos bg-zinc-950 ou black). Crie contraste usando bordas muito sutis (border-white/10), glassmorphism (backdrop-blur-xl bg-white/5) e brilhos radiais suaves (radial-gradient) no fundo para dar profundidade.
3. ESTRUTURA MODERNA: Fuja do comum. Use "Bento Grids" (cards de tamanhos diferentes se encaixando), tipografia gigante e limpa (tracking-tighter) e seções assimétricas.
4. ANIMAÇÕES AVANÇADAS: Use 'framer-motion' OBRIGATORIAMENTE. Os elementos NÃO podem simplesmente estar na tela. Faça-os surgir no scroll usando 'whileInView', use 'stagger' para listas, e adicione efeitos de hover magnéticos ou escalas suaves. A página deve parecer fluida e viva.
5. MÍDIA E ILUSTRAÇÕES: O serviço loremflickr gerou imagens ruins. Em vez de fotos genéricas, crie UIs abstratas usando divs do Tailwind (ex: esqueletos de dashboard brilhantes, gráficos de barras animados com framer-motion) para ilustrar os serviços. Se for estritamente necessário usar foto, use um placeholder monocromático sutil.

REGRAS DE CÓDIGO (OBRIGATÓRIO):
- Prefira UM ÚNICO arquivo path="/App.tsx" com export default function App().
- No chat, o usuário NÃO vê código: comece com 2–4 frases em pt-BR explicando o que está criando; depois só os blocos de código.
- Todo código DEVE estar num bloco Markdown com o path.
\`\`\`tsx path="/App.tsx"
import { motion } from 'framer-motion';
...
\`\`\`
NUNCA envie código solto.`;

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
        "2) Mídia rica obrigatória: imagens via loremflickr.com (keyword em inglês, ex: /1920/1080/luxury,car), vídeo no Hero quando couber, framer-motion em tudo. Hero com bg-cover + overlay bg-black/70. PROIBIDO interface seca só com texto.\n" +
        '3) No chat o usuário NÃO vê código: 2–4 frases em pt-BR explicando; depois só blocos ```tsx path="/App.tsx"``` com import { motion } from "framer-motion".\n' +
        "4) Se houver DADOS REAIS DO CLIENTE no system prompt, use-os no Header, Footer e Contato.";
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
        model: "anthropic/claude-3.5-sonnet",
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
