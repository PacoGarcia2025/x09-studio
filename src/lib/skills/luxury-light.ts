import type { StudioSkill } from "@/lib/skills/types";

export const LUXURY_LIGHT_BAR = `
BARRA VISUAL LUXURY LIGHT (OBRIGATÓRIA — marcas de alto padrão):
- Fundo principal: bg-[#FAFAFA] ou bg-stone-50 — NÃO dark mode por padrão.
- Tipografia: títulos com font-serif (font-serif tracking-tight) simulando Playfair/Cormorant; corpo font-sans limpo.
- Accent: ouro champagne (#D4AF37) ou bronze para CTAs, badges "Exclusividade", bordas finas e ícones.
- Espaço negativo generoso: py-24 md:py-32, max-w-7xl mx-auto, padding lateral amplo.
- Cards: bg-white shadow-sm ring-1 ring-stone-200/80 hover:shadow-lg hover:ring-[#D4AF37]/30 transition-all.
- Motion: framer-motion sutil (fade, slide 20px) — elegante, não exagerado.
- Imagens: Unsplash luxury real estate (interiores, fachadas) com loading="lazy" e alt descritivo.
- PROIBIDO: mesh dark zinc-950, violeta genérico, aesthetic "startup dark".
`.trim();

export const x09LuxuryLightSkill: StudioSkill = {
  id: "x09-luxury-light",
  name: "Luxury Light",
  plannerRules: `
- visualDirection DEVE citar paleta clara (#FAFAFA) + accent ouro/bronze (#D4AF37).
- Tom: sofisticado, exclusivo, inspirado em marcas globais de luxo — não tech startup dark.
`.trim(),
  builderFileRules: LUXURY_LIGHT_BAR,
  homePageRules: `
LUXURY LIGHT na HomePage:
- Hero claro full-bleed com imagem/vídeo overlay suave (opacity) ou carrossel imersivo.
- Smart Search bar: abas Comprar|Alugar|Lançamentos + filtros visuais (tipo, quartos, faixa preço).
- Seção destaques exclusivos com badges (Exclusividade, Penthouse).
- Seção estilo de vida (grid visual categorias).
- Social proof: números VGV, anos mercado, depoimentos premium.
- CTAs ouro champagne — nunca botão violeta genérico.
`.trim(),
  loginPageRules: `
- Login premium claro: card branco, borda fina stone-200, accent ouro nos CTAs.
`.trim(),
  dashboardPageRules: `
- Dashboard claro: sidebar branca, KPIs com accent ouro, tabelas limpas.
`.trim(),
  editRules: `
- Preserve estética luxury light — não converta para dark cinematic sem pedido explícito.
`.trim(),
};

/** Heurísticas para modo luxury light. */
export function lacksLuxuryLightQuality(home: string): string[] {
  const issues: string[] = [];
  const trimmed = home.trim();

  if (trimmed.length < 2200) {
    issues.push("HomePage curta demais para luxury light (< 2200 chars)");
  }

  const isDarkDominant =
    /from-zinc-950|bg-zinc-950|bg-black|from-black|via-zinc-900/i.test(trimmed) &&
    !/bg-\[#FAFAFA\]|bg-stone-50|bg-white/i.test(trimmed);

  if (isDarkDominant) {
    issues.push("Visual dark dominante — luxury light exige fundo claro (#FAFAFA/stone-50)");
  }

  const hasLight =
    /bg-\[#FAFAFA\]|bg-stone-50|bg-white|text-stone-900|text-zinc-900/i.test(trimmed);
  if (!hasLight) {
    issues.push("Faltam classes de fundo claro (bg-[#FAFAFA], stone-50 ou white)");
  }

  const hasAccent =
    /#D4AF37|D4AF37|amber-[45]00|yellow-[56]00|gold|champagne/i.test(trimmed);
  if (!hasAccent) {
    issues.push("Falta accent ouro/champagne (#D4AF37) em CTAs ou badges");
  }

  if (!/framer-motion|motion\./.test(trimmed)) {
    issues.push("Sem framer-motion — luxury exige micro-interações sutis");
  }

  const sections = (trimmed.match(/<section\b/gi) ?? []).length;
  if (sections < 4) {
    issues.push(`Poucas seções (${sections}) — luxury exige 4+ seções`);
  }

  return issues;
}
