import { useUserStore } from "@/store/user-store";

export type ApiChatMessage = {
  role: "user" | "ai" | "assistant" | "system";
  content: string;
};

/**
 * Preferência do usuário no UI.
 * - "auto"    → o X09 escolhe (edit/fast/premium) pelo comando
 * - "premium" → força Claude Sonnet
 */
export type GenerationPreference = "auto" | "premium";

/** Modo efetivo após o roteador. */
export type ResolvedMode = "edit" | "fast" | "premium";

export type RouteContext = {
  preference: GenerationPreference;
  /** Já existe App.tsx gerado (não só o placeholder inicial). */
  hasExistingApp: boolean;
  /** Código atual de /App.tsx — injetado no modo edit. */
  currentAppCode?: string;
};

export const MODE_LABELS: Record<ResolvedMode, string> = {
  edit: "Groq · edição rápida",
  fast: "Gemini · rápido",
  premium: "Claude · premium",
};

/** Modelos OpenRouter (fast / premium). */
export const OPENROUTER_MODEL: Record<"fast" | "premium", string> = {
  fast: "google/gemini-2.5-flash",
  premium: "anthropic/claude-sonnet-4.5",
};

/** Modelo Groq (OpenAI-compatible). */
export const GROQ_MODEL = "llama-3.3-70b-versatile";

const EDIT_HINTS =
  /\b(troca|trocar|muda|mudar|altera|alterar|ajusta|ajustar|corrige|corrigir|renomeia|renomear|adiciona|adicionar|remove|remover|tira|tirar|coloca|colocar|atualiza|atualizar|substitu[ií]|whatsapp|instagram|email|e-mail|logo|cor|cores|texto|t[ií]tulo|bot[aã]o|fonte|espa[cç]o|padding|margin|tamanho|icone|ícone)\b/i;

const PREMIUM_HINTS =
  /\b(premium|ag[eê]ncia|refaz(er)?\s+(com\s+)?qualidade|melhor\s+qualidade|vers[aã]o\s+final|cinematogr[aá]fico|nível\s+stripe|nível\s+linear)\b/i;

const CREATE_HINTS =
  /\b(cria|criar|gere|gerar|fa[cç]a|fazer|monte|montar|landing|p[aá]gina|site|home|homepage|from\s+scratch|do\s+zero)\b/i;

/**
 * O X09 escolhe o provedor pelo comando:
 * - edição curta em app existente → Groq
 * - intenção premium → Claude
 * - criação / restante → Gemini Flash
 */
export function resolveGenerationMode(
  prompt: string,
  ctx: Pick<RouteContext, "preference" | "hasExistingApp">,
): ResolvedMode {
  if (ctx.preference === "premium") return "premium";

  const text = prompt.trim();
  const short = text.length < 220;

  if (PREMIUM_HINTS.test(text)) return "premium";

  if (
    ctx.hasExistingApp &&
    short &&
    EDIT_HINTS.test(text) &&
    !CREATE_HINTS.test(text)
  ) {
    return "edit";
  }

  return "fast";
}

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
- lucide-react (OBRIGATÓRIO): ícones em TODOS os cards, CTAs, lista de features, contatos.
  Só ícones que EXISTEM no pacote. Lista segura: Sparkles, Zap, Shield, Rocket, ArrowUpRight, Play, Check, Globe, Cpu, Layers, Hexagon, Mail, Phone, MessageCircle, AtSign, MapPin, Home, Building2, Users, Star, TrendingUp, ArrowRight.
  PROIBIDO importar do lucide: Instagram, Facebook, Twitter, Linkedin, WhatsApp, Youtube, TikTok — esses NÃO existem e quebram o Preview.
  Para redes/contato use: AtSign (Instagram), MessageCircle (WhatsApp), Mail (e-mail), Phone (telefone), Share2 (social genérico).
- recharts: use em pelo menos UMA seção (sparkline, barras ou área) quando o produto for SaaS/tech/dados.
- React + Tailwind via CDN (já injetado no preview). NUNCA faça \`import 'tailwindcss'\` nem \`import 'tailwindcss/tailwind.css'\` — isso quebra o Sandpack.
- Sem next/, shadcn, @/, react-router, three.js.

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
6. PROIBIDO: import de tailwindcss, .css locais, next/image, @/
7. No chat: 2–3 frases em pt-BR dizendo o conceito visual; depois SÓ o bloco de código.
8. Se o resultado parecer template genérico, você falhou — entregue algo que cause "uau".`;

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

const EDIT_SYSTEM_PROMPT = `Você é o X09 Studio em modo EDIÇÃO RÁPIDA.
Tarefa: aplicar APENAS a alteração pedida no App.tsx existente.
Regras:
1. Preserve layout, design system, motion e estrutura — mude só o necessário.
2. Resposta: 1–2 frases em pt-BR + único bloco \`\`\`tsx path="/App.tsx"\`\`\` com o arquivo COMPLETO atualizado.
3. NUNCA importar tailwindcss. Use framer-motion e lucide-react se já estiverem no arquivo.
4. Não redesenhe a página do zero.`;

const ART_QA =
  "\n\n[QA DE ARTE — FALHA = REFAZER]\n" +
  "1) pt-BR em todo o UI.\n" +
  "2) PROIBIDO: loremflickr, unsplash inventado, grid 3 cards iguais, gradiente purple-pink de IA, página sem motion, ícones lucide inexistentes (Instagram/WhatsApp/Facebook/Twitter/Linkedin).\n" +
  "3) OBRIGATÓRIO: Hero cinematográfico (título enorme), orbs/glow, bento assimétrico, whileInView + stagger, CTAs rounded-full, ícones lucide válidos (AtSign/MessageCircle/Mail/Phone para contato), mock 3D com perspective/rotate.\n" +
  "4) Pelo menos 1 uso de useScroll/useTransform OU float infinito no Hero.\n" +
  '5) Resposta: 2–3 frases + único bloco ```tsx path="/App.tsx"```. NUNCA importar tailwindcss — Tailwind já está no CDN.\n' +
  "6) Dados REAIS DO CLIENTE no Header/Footer/Contato quando existirem.\n" +
  "7) O site deve parecer produto de R$30k — se parecer amador, você falhou.";

function prepareMessages(
  messages: ApiChatMessage[],
  mode: ResolvedMode,
  currentAppCode?: string,
): { system: string; messages: Array<{ role: "system" | "user" | "assistant"; content: string }> } {
  const userContext = buildUserContext();
  const system =
    mode === "edit"
      ? EDIT_SYSTEM_PROMPT + userContext
      : SYSTEM_PROMPT + userContext;

  const formatted = messages
    .filter((message) => message.content.trim().length > 0)
    .map((msg) => ({ ...msg }));

  const lastIndex = formatted.length - 1;
  if (lastIndex >= 0 && formatted[lastIndex]!.role === "user") {
    if (mode === "edit" && currentAppCode?.trim()) {
      formatted[lastIndex]!.content +=
        `\n\n=== App.tsx ATUAL (edite este arquivo) ===\n\`\`\`tsx\n${currentAppCode}\n\`\`\`\n` +
        "Aplique só a alteração pedida e devolva o arquivo completo.";
    } else {
      formatted[lastIndex]!.content += ART_QA;
    }
  }

  return {
    system,
    messages: [
      { role: "system", content: system },
      ...formatted.map((message) => ({
        role: mapToOpenRouterRole(message.role),
        content: message.content,
      })),
    ],
  };
}

async function streamOpenAICompatible(options: {
  url: string;
  apiKey: string;
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature: number;
  extraHeaders?: Record<string, string>;
  providerLabel: string;
  onChunk: (text: string) => void;
  onFinish: (text: string) => void;
}): Promise<void> {
  let accumulated = "";

  try {
    const response = await fetch(options.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${options.apiKey}`,
        ...options.extraHeaders,
      },
      body: JSON.stringify({
        model: options.model,
        stream: true,
        temperature: options.temperature,
        messages: options.messages,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      const errorText = `Erro ${options.providerLabel} (${response.status}): ${errorBody || response.statusText}`;
      options.onChunk(errorText);
      options.onFinish(errorText);
      return;
    }

    if (!response.body) {
      const errorText = `A resposta de ${options.providerLabel} não incluiu um corpo com stream.`;
      options.onChunk(errorText);
      options.onFinish(errorText);
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
          options.onChunk(accumulated);
        } catch {
          // Ignora chunks SSE incompletos/inválidos
        }
      }
    }

    options.onFinish(accumulated);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha desconhecida no streaming.";
    const errorText = `Falha ao conectar em ${options.providerLabel}: ${message}`;
    options.onChunk(accumulated || errorText);
    options.onFinish(accumulated || errorText);
  }
}

/**
 * Streaming com roteamento automático:
 * - edit    → Groq (direto), fallback Gemini via OpenRouter
 * - fast    → Gemini Flash (OpenRouter)
 * - premium → Claude Sonnet (OpenRouter)
 *
 * Retorna o modo efetivo usado (útil para UI).
 */
export async function streamAIResponse(
  onChunk: (text: string) => void,
  onFinish: (text: string) => void,
  messages: ApiChatMessage[],
  route: RouteContext,
): Promise<ResolvedMode> {
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const mode = resolveGenerationMode(lastUser?.content ?? "", route);
  const prepared = prepareMessages(messages, mode, route.currentAppCode);

  if (mode === "edit") {
    const groqKey = import.meta.env.VITE_GROQ_API_KEY as string | undefined;
    if (groqKey && !groqKey.includes("sua-chave")) {
      await streamOpenAICompatible({
        url: "https://api.groq.com/openai/v1/chat/completions",
        apiKey: groqKey,
        model: GROQ_MODEL,
        messages: prepared.messages,
        temperature: 0.4,
        providerLabel: "Groq",
        onChunk,
        onFinish,
      });
      return mode;
    }
    // Sem chave Groq → cai no Gemini (ainda é "edit" no prompt)
  }

  const openRouterKey = import.meta.env.VITE_OPENROUTER_API_KEY as
    | string
    | undefined;

  if (!openRouterKey || openRouterKey.includes("sua-chave-aqui")) {
    const errorText =
      mode === "edit"
        ? "Configure `VITE_GROQ_API_KEY` (edições) ou `VITE_OPENROUTER_API_KEY` no `.env.local` e reinicie o `npm run dev`."
        : "Configure `VITE_OPENROUTER_API_KEY` no arquivo `.env.local` e reinicie o `npm run dev`.";
    onChunk(errorText);
    onFinish(errorText);
    return mode;
  }

  const openRouterMode = mode === "premium" ? "premium" : "fast";

  await streamOpenAICompatible({
    url: "https://openrouter.ai/api/v1/chat/completions",
    apiKey: openRouterKey,
    model: OPENROUTER_MODEL[openRouterMode],
    messages: prepared.messages,
    temperature: mode === "edit" ? 0.4 : 0.85,
    extraHeaders: {
      "HTTP-Referer": "http://localhost:5173",
      "X-Title": "x09 Studio",
    },
    providerLabel: "OpenRouter",
    onChunk,
    onFinish,
  });

  return mode;
}
