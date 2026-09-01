import { isLuxuryLight } from "@/lib/skills/detect";
import { lacksLuxuryLightQuality } from "@/lib/skills/luxury-light";
import {
  countPageSections,
  meetsPremiumSectionBar,
} from "@/lib/pipeline/page-sections";

/**
 * Barra de qualidade visual cinematográfica / premium showcase (nível agência R$15–30k).
 * PADRÃO GLOBAL de todos os sites/apps gerados — só muda se o brief pedir outro estilo
 * (ex.: luxury light, minimal flat, brutalist).
 */
export const CINEMATIC_PREMIUM_BAR = `
PADRÃO VISUAL OBRIGATÓRIO (cinematográfico / premium showcase):
- Use este padrão em TODAS as páginas (Home, Login, Dashboard, listagens) a menos que o brief peça EXPLICITAMENTE outro estilo (ex.: "luxury light", "minimalista flat", "brutalista", "só branco clean").
- Showcase premium: hero imersivo, profundidade, motion, ritmo de seções, CTAs fortes — produto vendável, não protótipo.

BARRA DE QUALIDADE:
- Profundidade: gradientes mesh (ex: from-zinc-950 via-zinc-900 to-[cor-marca]/30), orbs decorativos (blur-[100px] opacity-20–40), glass cards (backdrop-blur-xl bg-white/5 border border-white/10).
- Motion: import { motion } from "framer-motion" — hero com fade/slide, staggerChildren nas seções, hover sutil (scale 1.02, shadow glow da marca).
- Tipografia: headlines text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight; corpo text-base md:text-lg leading-relaxed; hierarquia clara.
- Ritmo: alternar seções escuras/claras; NUNCA 3 cards idênticos sem variação de layout (bento, grid assimétrico, destaque lateral).
- CTAs: botões com cor de marca + shadow-lg shadow-[cor]/25 — proibido botão cinza genérico em todo o site.
- Ícones: lucide-react (Sparkles, ArrowRight, Shield, Building2, Phone, Mail, MapPin, Star, Check, etc.).
- Imagens: gradientes + Unsplash real (https://images.unsplash.com/photo-...) OU composições CSS — nunca placeholder vazio.
- Hero fase 1: fundo imersivo (gradiente/mesh/Unsplash) + elemento PNG/recorte transparente sobreposto (produto, pessoa ou objeto do nicho via <img> com object-contain ou composição CSS) — efeito showcase de agência.
- Cards de serviços/benefícios: CADA card com foto correspondente ao tema (Unsplash), não só ícone.
- Copy: persuasiva, específica do negócio, números e provas quando possível.
- Cor de marca: use a cor do brief do cliente. PROIBIDO aesthetic "template de IA" (roxo/rosa genérico sem brief), lorem, "Sua Empresa", página chapada, hero só com retângulo colorido.
`.trim();

export const STACK_RULES = `
Stack FIXA (Sandpack preview):
- Vite + React + TypeScript — NÃO Next.js, NÃO next/*, NÃO AppShell "Meu App".
- Tailwind via className (CDN). NÃO importar tailwindcss nem CSS externo.
- NÃO use import.meta.env — use getSupabase() de ../lib/supabase.
- Pacotes NPM permitidos: lucide-react, framer-motion, recharts, @supabase/supabase-js, leaflet, clsx — NÃO use axios, react-router, next/*, chart.js, @mui/*.
- TSX válido: feche TODAS tags, strings e chaves. Nunca trunque o arquivo.
`.trim();

/** Heurísticas de qualidade visual no código gerado. */
export function lacksCinematicQuality(home: string): string[] {
  const issues: string[] = [];
  const trimmed = home.trim();

  if (trimmed.length < 2200) {
    issues.push("HomePage curta demais para padrão premium (< 2200 chars)");
  }

  const sections = countPageSections(trimmed);
  if (!meetsPremiumSectionBar(trimmed, 4)) {
    issues.push(
      `Poucas seções (${sections}) — premium exige 4+ seções distintas ou conteúdo denso`,
    );
  }

  const hasMotion =
    /framer-motion|motion\.(div|section|header|footer|span)/.test(trimmed);
  const hasDepth =
    /backdrop-blur|blur-\[|gradient|from-zinc|via-|mesh|opacity-\d+/i.test(
      trimmed,
    );

  if (!hasMotion) {
    issues.push("Sem framer-motion — premium exige animações sutis");
  }
  if (!hasDepth) {
    issues.push("Sem profundidade visual (gradientes/glass/blur/orbs)");
  }

  const genericAiSlop =
    /from-violet-600 to-fuchsia|from-purple-600|bg-violet-600.*bg-fuchsia/i.test(
      trimmed,
    );
  if (genericAiSlop && !/verde|oliva|olive|emerald|orange|amber|cyan|rose/i.test(trimmed)) {
    issues.push("Visual genérico violeta/fúcsia de template IA");
  }

  return issues;
}

/** Luxury light ou cinematic conforme brief. */
export function lacksPremiumQuality(home: string, prompt: string): string[] {
  return isLuxuryLight(prompt)
    ? lacksLuxuryLightQuality(home)
    : lacksCinematicQuality(home);
}
