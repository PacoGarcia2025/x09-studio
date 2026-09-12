export type VisualVerdict = "PASS" | "IMPROVE" | "FAIL";

export type VisualExperienceAssessment = {
  verdict: VisualVerdict;
  score: number;
  reasons: string[];
  businessFit: string;
};

export function evaluateVisualExperience(
  code: string,
  briefPrompt: string,
  experiencePreset?: string,
): VisualExperienceAssessment {
  const source = code || "";
  const text = briefPrompt.toLowerCase();
  const isLuxury = /(luxo|luxury|high[- ]?end|premium|alto padr[aã]o)/i.test(text);
  const isGame = /(game|jogo|gaming|rpg|immersive|cinematic|storytelling)/i.test(text);
  const isRestaurant = /(restaurante|hamburguer|burger|food|cardapio|delivery)/i.test(text);
  const isRealEstate = /(imobili|imovel|corretor|apartamento|venda|aluguel|condominio)/i.test(text);

  const reasons: string[] = [];
  let score = 0;

  if (source.length > 1800) score += 12;
  else reasons.push("Conteúdo visual muito curto para uma experiência premium.");

  if (/<section|<main|<header|<article/i.test(source)) score += 12;
  else reasons.push("Pouca estrutura de layout e hierarquia semântica.");

  if (/(h1|hero|headline|title|text-4xl|text-5xl|text-6xl)/i.test(source)) score += 12;
  else reasons.push("Falta hierarquia visual forte em headline principal.");

  if (/(premium|exclusivo|vendas|garantia|visita|apartamento|residencial|luxe|luxo|lead|servicos)/i.test(source)) score += 15;

  if (/<section/i.test(source) && /<button|agendar|comprar|contato|reservar/i.test(source) && /(h1|headline|title)/i.test(source)) score += 16;

  if (/(motion|framer-motion|animate-|transition-|transform|backdrop-blur|blur-|shadow-|gradient-to|from-.*via-.*to-)/i.test(source)) score += 18;
  else reasons.push("Sem motion, profundidade ou contraste visual relevante.");

  if (/(cta|button|agendar|comprar|contato|whatsapp|reservar)/i.test(source)) score += 10;
  else reasons.push("Sem CTA forte e orientado à conversão.");

  if (/(aria-|alt=|role=|accessibility|label)/i.test(source)) score += 8;
  else reasons.push("Acessibilidade e leitura do UI estão fracas.");

  if (/(storytelling|prova|depoimento|beneficios|diferenciais|servicos|gallery|cards)/i.test(source)) score += 10;
  else reasons.push("Narrativa e prova de valor pouco explícitas.");

  if (/(from-zinc-950|from-black|via-zinc|bg-gradient-to-br|backdrop-blur-xl|shadow-.*\[.*\]|blur-\[)/i.test(source)) score += 10;
  if (/(bg-white|bg-stone-50|bg-[#FAFAFA]|ring-stone|shadow-sm)/i.test(source)) score += 8;

  if (isLuxury && /(bg-white|bg-stone-50|#D4AF37|champagne|gold|ring-stone|luxury|exclusive)/i.test(source)) score += 10;
  if (isGame && /(cinematic|immersive|glow|neon|futuristic|gradient-to-br|shadow-.*cyan|shadow-.*purple)/i.test(source)) score += 10;
  if (isRestaurant && /(food|menu|cardapio|prato|destaque|warm|amber|orange)/i.test(source)) score += 10;
  if (isRealEstate && /(imovel|apartamento|casa|vista|exclusivo|lead|contato|visita)/i.test(source)) score += 10;

  const hasGenericPattern = /(Bem-vindo|Meu App|Lorem ipsum|Esta empresa|Sua Empresa|template de IA|roxo|fuchsia)/i.test(source);
  if (hasGenericPattern) {
    score = Math.max(0, score - 20);
    reasons.push("O visual ainda parece genérico, sem identidade clara.");
  }

  const antiGeneric = /antiGeneric|brandSignal|storytelling|artDirection|interaction|conversion/.test(briefPrompt) || Boolean(experiencePreset);
  if (antiGeneric && /brand|identidade|premium|direcao|storytelling|personalidade/i.test(briefPrompt)) {
    score += 6;
  }

  if (score >= 80) {
    return { verdict: "PASS", score: Math.min(100, score), reasons: reasons.slice(0, 4), businessFit: "WOW: visual memorável e apropriado ao negócio." };
  }

  if (score >= 45) {
    return { verdict: "IMPROVE", score: Math.min(100, score), reasons: reasons.slice(0, 5), businessFit: "PROFESSIONAL: funcional e consistente, mas ainda sem identidade forte." };
  }

  return { verdict: "FAIL", score: Math.max(0, score), reasons: reasons.slice(0, 6), businessFit: "FUNCTIONAL: a página funciona, mas está genérica e pouco diferenciada." };
}
