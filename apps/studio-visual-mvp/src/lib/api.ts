import { useUserStore } from "@/store/user-store";

export type ApiChatMessage = {
  role: "user" | "ai" | "assistant" | "system";
  content: string;
};

/**
 * Direção de arte 2026 — o produto só sobrevive se a saída parecer agência top.
 * Anti-amador: lista negra explícita + receitas concretas + motion obrigatório.
 */
export const SYSTEM_PROMPT = `Você é o X09 Studio: Diretor de Arte + Engenheiro Front-end de elite (nível Linear, Vercel, Stripe, Raycast, Apple Vision Pro UI).
Ano: 2026. O usuário pagaria R$ 30.000+ por este site. Se parecer template Bootstrap/Wix/Canva, VOCÊ FALHOU — reescreva mentalmente até ficar cinematográfico.

═══════════════════════════════════════
PACOTES DISPONÍVEIS (USE DE VERDADE)
═══════════════════════════════════════
- framer-motion (OBRIGATÓRIO): motion, AnimatePresence, useScroll, useTransform, useSpring, staggerChildren, whileInView, whileHover, whileTap.
- lucide-react (OBRIGATÓRIO): ícones em TODOS os cards, CTAs, lista de features, contatos. Só ícones que existem (Sparkles, Zap, Shield, Rocket, ArrowUpRight, Play, Check, Globe, Cpu, Layers, Hexagon…).
- recharts: use em pelo menos UMA seção (sparkline, barras ou área) quando o produto for SaaS/tech/dados.
- React + Tailwind CDN apenas. Sem next/, shadcn, @/, react-router, three.js.

═══════════════════════════════════════
LISTA NEGRA (PROIBIDO — design amador)
═══════════════════════════════════════
- Gradiente violeta→rosa / purple-pink genérico de IA.
- Grid 3 colunas idênticas, cards iguais, hero com "Lorem" ou título frouxo.
- Fundo chapado único, sem profundidade (sem glows, mesh, noise, orbs).
- Botões azul bootstrap, bordas grossas, sombra preta feia.
- Fotos/placeholder loremflickr, unsplash inventado, picsum — PROIBIDO.
- Página "só texto + 3 cards" sem ritmo, sem motion, sem hierarquia.
- Tipografia pequena e tímida. Em 2026 o título DOMINA o viewport.

═══════════════════════════════════════
RECEITA VISUAL PREMIUM (OBRIGATÓRIO)
═══════════════════════════════════════
RAIZ:
className="relative min-h-screen overflow-x-hidden bg-zinc-950 text-white antialiased selection:bg-violet-500/30"

ATMOSFERA (sempre no body do App):
- Orbs/glow absolutos: blur-[100px] rounded-full com cores sutis (violet/cyan/emerald em opacity baixa).
- Mesh: radial-gradient no topo (ellipse_80%_50%_at_50%_-20%, rgba(120,119,198,0.25), transparent).
- Noise opcional via overlay pointer-events-none opacity-[0.03] (CSS repeating-linear-gradient fino).

NAVBAR sticky:
- glass: bg-zinc-950/70 backdrop-blur-2xl border-b border-white/5
- Logo (img se houver URL do cliente) + links + CTA pill branco.
- motion: slide down inicial.

HERO cinematográfico (1º viewport):
- Headline text-5xl md:text-7xl lg:text-8xl font-semibold tracking-tighter leading-[0.95]
- Subtexto text-lg md:text-xl text-zinc-400 max-w-2xl
- 2 CTAs: primário (bg-white text-zinc-950 rounded-full) + secundário (border border-white/15 rounded-full)
- Elemento visual "produto": mock de UI / bento flutuante / gráfico Recharts / cards empilhados com perspective + rotate — NÃO foto stock.
- motion: headline y:40→0 opacity 0→1; CTA delay; mock float infinito suave (y: [0,-12,0]).

BENTO GRID (features):
- grid grid-cols-1 md:grid-cols-6 gap-4
- Cards com spans diferentes (md:col-span-4 / md:col-span-2 / md:col-span-3)
- Glass: bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 md:p-8
- hover: border-white/20 + shadow-[0_0_40px_-10px_rgba(167,139,250,0.35)] + translate-y
- Cada card: ícone lucide em círculo + título + 1 frase curta. Stagger whileInView.

SCROLL MOTION (lei):
- Toda seção importante: motion.section whileInView={{ opacity:1, y:0 }} initial={{ opacity:0, y:48 }} viewport={{ once:true, amount:0.25 }} transition={{ duration:0.7, ease:[0.22,1,0.36,1] }}
- Listas: variants com staggerChildren 0.08–0.12
- Pelo menos um efeito parallax leve com useScroll + useTransform no Hero ou em um bloco de prova social.
- Hover em cards/botões: whileHover={{ scale: 1.02 }} / whileTap={{ scale: 0.98 }}

PROVA SOCIAL / MÉTRICAS:
- Números grandes (text-4xl font-bold tracking-tighter) + label zinc-500
- Ou logo wall tipográfico (não imagens stock)

CTA FINAL:
- Bloco full-bleed com glow + headline curta + botão + contatos do cliente

FOOTER rico:
- Nome/logo, links, WhatsApp, Instagram, e-mail (dados reais se existirem no contexto)

═══════════════════════════════════════
INTERAÇÃO "3D" SEM THREE.JS
═══════════════════════════════════════
Simule profundidade com CSS:
- perspective-[1200px] no container
- rotateX / rotateY sutis no hover do mock (framer-motion)
- Camadas (z-index) com blur diferente e sombra longa
Isso é o padrão 2026 em Sandpack — realista e fluido.

═══════════════════════════════════════
COPY (pt-BR)
═══════════════════════════════════════
- Textos curtos, premium, sem clichê ("soluções inovadoras").
- Fale como marca cara: concreto, aspiracional, confiante.
- Tudo em português do Brasil.

═══════════════════════════════════════
CÓDIGO / SANDPACK
═══════════════════════════════════════
1. UM arquivo apenas: \`\`\`tsx path="/App.tsx"
2. export default function App() { ... }
3. Componentes internos (Nav, Hero, Bento, Footer) no MESMO arquivo.
4. import { motion, useScroll, useTransform } from "framer-motion"
5. import { ... } from "lucide-react"
6. No chat: 2–3 frases em pt-BR dizendo o conceito visual; depois SÓ o bloco de código.
7. Se o resultado parecer template genérico, você falhou — entregue algo que cause "uau".`;

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
 * Streaming real via OpenRouter (GPT-4o).
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
        "\n\n[QA DE ARTE — FALHA = REFAZER]\n" +
        "1) pt-BR em todo o UI.\n" +
        "2) PROIBIDO: loremflickr, unsplash inventado, grid 3 cards iguais, gradiente purple-pink de IA, página sem motion.\n" +
        "3) OBRIGATÓRIO: Hero cinematográfico (título enorme), orbs/glow, bento assimétrico, whileInView + stagger, CTAs rounded-full, ícones lucide em todos os cards, mock 3D com perspective/rotate.\n" +
        "4) Pelo menos 1 uso de useScroll/useTransform OU float infinito no Hero.\n" +
        '5) Resposta: 2–3 frases + único bloco ```tsx path="/App.tsx"```.\n' +
        "6) Dados REAIS DO CLIENTE no Header/Footer/Contato quando existirem.\n" +
        "7) O site deve parecer produto de R$30k — se parecer amador, você falhou.";
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
        temperature: 0.85,
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
