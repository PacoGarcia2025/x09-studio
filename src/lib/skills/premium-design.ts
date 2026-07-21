import { isLuxuryLight } from "@/lib/skills/detect";
import { lacksLuxuryLightQuality } from "@/lib/skills/luxury-light";

/**
 * Barra de qualidade visual cinematográfica (nível agência R$15–30k).
 * Compartilhada entre skills de geração.
 */
export const CINEMATIC_PREMIUM_BAR = `
BARRA DE QUALIDADE VISUAL (OBRIGATÓRIA — produto premium vendável):
- Profundidade: gradientes mesh (ex: from-zinc-950 via-zinc-900 to-[cor-marca]/30), orbs decorativos (blur-[100px] opacity-20–40), glass cards (backdrop-blur-xl bg-white/5 border border-white/10).
- Motion: import { motion } from "framer-motion" — hero com fade/slide, staggerChildren nas seções, hover sutil (scale 1.02, shadow glow da marca).
- Tipografia: headlines text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight; corpo text-base md:text-lg leading-relaxed; hierarquia clara.
- Ritmo: alternar seções escuras/claras; NUNCA 3 cards idênticos sem variação de layout (bento, grid assimétrico, destaque lateral).
- CTAs: botões com cor de marca + shadow-lg shadow-[cor]/25 — proibido botão cinza genérico em todo o site.
- Ícones: lucide-react (Sparkles, ArrowRight, Shield, Building2, Phone, Mail, MapPin, Star, Check, etc.).
- Imagens: gradientes + Unsplash real (https://images.unsplash.com/photo-...) OU composições CSS — nunca placeholder vazio.
- Copy: persuasiva, específica do negócio, números e provas quando possível.
- PROIBIDO: aesthetic "template de IA" (roxo/rosa genérico sem brief), lorem, "Sua Empresa", página chapada, hero só com retângulo colorido.
`.trim();

export const STACK_RULES = `
Stack FIXA (Sandpack preview):
- Vite + React + TypeScript — NÃO Next.js, NÃO next/*, NÃO AppShell "Meu App".
- Tailwind via className (CDN). NÃO importar tailwindcss nem CSS externo.
- NÃO use import.meta.env — use getSupabase() de ../lib/supabase.
- TSX válido: feche TODAS tags, strings e chaves. Nunca trunque o arquivo.
`.trim();

/** Heurísticas de qualidade visual no código gerado. */
export function lacksCinematicQuality(home: string): string[] {
  const issues: string[] = [];
  const trimmed = home.trim();

  if (trimmed.length < 2200) {
    issues.push("HomePage curta demais para padrão premium (< 2200 chars)");
  }

  const sections = (trimmed.match(/<section\b/gi) ?? []).length;
  if (sections < 4) {
    issues.push(`Poucas seções (${sections}) — premium exige 4+ seções distintas`);
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
