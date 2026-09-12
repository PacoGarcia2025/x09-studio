export type CreativePatternCategory =
  | "hero"
  | "navigation"
  | "storytelling"
  | "product-showcase"
  | "cards"
  | "pricing"
  | "testimonials"
  | "cta"
  | "motion"
  | "microinteractions"
  | "editorial"
  | "cinematic"
  | "luxury"
  | "futuristic"
  | "immersive"
  | "experimental";

export type CreativePattern = {
  id: string;
  name: string;
  category: CreativePatternCategory;
  description: string;
  whenUse: string[];
  whenAvoid: string[];
  compatibleSegments: string[];
  compatibleExperiences: string[];
  impactVisual: "baixo" | "médio" | "alto";
  complexity: "baixa" | "média" | "alta";
  estimatedContextCost: "baixo" | "médio" | "alto";
  requirements: string[];
  recommendedCombinations: string[];
  tags: string[];
};

export type CreativePatternSelectionInput = {
  businessDna?: {
    industry?: string;
    businessType?: string;
    audience?: string[];
    goals?: string[];
    modules?: string[];
    uxPatterns?: string[];
    visualPatterns?: string[];
    rules?: string[];
  };
  experienceDna?: {
    preset?: string;
    summary?: string;
    visual?: { tone?: string; motion?: string };
    direction?: { artDirection?: string; storytelling?: string; conversion?: string };
    navigation?: string[];
  };
  blueprint?: {
    industry?: string;
    productType?: string;
    experience?: string;
    modules?: string[];
    priorities?: string[];
    visual?: { motion?: string; palette?: string[] };
  };
  taskContext?: string;
  maxPatterns?: number;
};

export const CREATIVE_PATTERN_LIBRARY: CreativePattern[] = [
  {
    id: "hero-cinematic",
    name: "Hero Cinemático",
    category: "hero",
    description: "Headline forte, camadas visuais, CTA dominante e narrativa curta.",
    whenUse: ["landing premium", "site institucional", "portal imobiliário", "produto com valor forte"],
    whenAvoid: ["dashboard simples", "produto interno sem storytelling", "site puramente informativo"],
    compatibleSegments: ["imobiliaria", "restaurante", "saas", "agencia"],
    compatibleExperiences: ["premium", "cinematic", "luxury", "immersive"],
    impactVisual: "alto",
    complexity: "média",
    estimatedContextCost: "médio",
    requirements: ["headline clara", "imagem de fundo ou gradiente forte", "CTA principal"],
    recommendedCombinations: ["storytelling", "cta", "product-showcase"],
    tags: ["hero", "cinematic", "cta"],
  },
  {
    id: "storytelling",
    name: "Storytelling de Valor",
    category: "storytelling",
    description: "Narrativa em camadas que explica problema, solução e prova social sem ruído.",
    whenUse: ["marca com diferenciais", "vendas premium", "projeto com prova e credibilidade"],
    whenAvoid: ["site de checkout direto", "produto ultra minimalista sem contexto"],
    compatibleSegments: ["imobiliaria", "restaurante", "saas", "agencia"],
    compatibleExperiences: ["premium", "editorial", "cinematic", "luxury"],
    impactVisual: "alto",
    complexity: "média",
    estimatedContextCost: "médio",
    requirements: ["3 blocos de valor", "prova social ou diferenciais", "sequência clara"],
    recommendedCombinations: ["hero-cinematic", "testimonials", "cards"],
    tags: ["storytelling", "proof", "narrative"],
  },
  {
    id: "product-showcase",
    name: "Product Showcase",
    category: "product-showcase",
    description: "Exibe o produto ou benefício em composição visual com destaque e contexto de uso.",
    whenUse: ["imóveis", "produtos premium", "serviços com visual forte", "catalogo"],
    whenAvoid: ["app corporativo sem interfaces visuais", "site com apenas texto"],
    compatibleSegments: ["imobiliaria", "restaurante", "saas", "portfolio"],
    compatibleExperiences: ["cinematic", "luxury", "premium", "immersive"],
    impactVisual: "alto",
    complexity: "média",
    estimatedContextCost: "médio",
    requirements: ["imagem ou mockup", "destaque do que está sendo vendido", "legenda opcional"],
    recommendedCombinations: ["hero-cinematic", "cards", "cta"],
    tags: ["showcase", "catalog", "product"],
  },
  {
    id: "cards-bento",
    name: "Cards Bento",
    category: "cards",
    description: "Grid assimétrico para serviços, diferenciais, resultados ou itens de catálogo.",
    whenUse: ["apresentar serviços", "benefícios em sequência", "catalogo de itens"],
    whenAvoid: ["lista linear muito curta", "apenas um bloco único sem variação"],
    compatibleSegments: ["imobiliaria", "restaurante", "saas", "agencia"],
    compatibleExperiences: ["premium", "editorial", "minimal", "cinematic"],
    impactVisual: "médio",
    complexity: "baixa",
    estimatedContextCost: "baixo",
    requirements: ["3+ itens", "variação visual", "hierarquia de conteúdo"],
    recommendedCombinations: ["storytelling", "pricing", "testimonials"],
    tags: ["cards", "grid", "benefits"],
  },
  {
    id: "pricing-decision",
    name: "Pricing/Decision",
    category: "pricing",
    description: "Estrutura de decisão com planos, pacote principal e CTA esclarecido.",
    whenUse: ["saas", "agências", "serviços premium", "produto com múltiplos planos"],
    whenAvoid: ["landing com único chamou sem comparação", "projeto não monetizável"],
    compatibleSegments: ["saas", "agencia", "restaurante", "servicos"],
    compatibleExperiences: ["conversion", "premium", "minimal", "luxury"],
    impactVisual: "médio",
    complexity: "média",
    estimatedContextCost: "baixo",
    requirements: ["3 opções", "destaque para opção recomendada", "CTA por plano"],
    recommendedCombinations: ["cta", "testimonials", "cards-bento"],
    tags: ["pricing", "plans", "decision"],
  },
  {
    id: "testimonials-proof",
    name: "Prova Social / Depoimentos",
    category: "testimonials",
    description: "Uso de depoimentos, métricas e prova para reduzir resistência e aumentar confiança.",
    whenUse: ["venda premium", "serviços de alto valor", "site com prova social"],
    whenAvoid: ["produto sem prova social e sem risco percebido", "mercado de alta confiança direta"],
    compatibleSegments: ["imobiliaria", "agencia", "saas", "restaurante"],
    compatibleExperiences: ["premium", "luxury", "cinematic", "editorial"],
    impactVisual: "médio",
    complexity: "baixa",
    estimatedContextCost: "baixo",
    requirements: ["comentários reais ou simulados", "métricas e contexto de uso"],
    recommendedCombinations: ["storytelling", "cta", "pricing-decision"],
    tags: ["proof", "testimonials", "trust"],
  },
  {
    id: "cta-premium",
    name: "CTA Premium",
    category: "cta",
    description: "Botão ou bloco de ação com foco em conversão, com copy específica e clara.",
    whenUse: ["qualquer landing", "lead capture", "fluxo de conversão", "reservas"],
    whenAvoid: ["menu puro sem intenção de ação", "site apenas informativo"],
    compatibleSegments: ["imobiliaria", "restaurante", "saas", "agencia"],
    compatibleExperiences: ["premium", "conversion", "cinematic", "luxury"],
    impactVisual: "alto",
    complexity: "baixa",
    estimatedContextCost: "baixo",
    requirements: ["copy orientada a ação", "cor de destaque", "posição visível"],
    recommendedCombinations: ["hero-cinematic", "pricing-decision", "testimonials-proof"],
    tags: ["cta", "conversion", "action"],
  },
  {
    id: "motion-subtle",
    name: "Motion Subtil",
    category: "motion",
    description: "Movimento apenas em pontos estratégicos para dar profundidade e ritmo sem poluição.",
    whenUse: ["hero", "cards", "transições", "efeitos de hover"],
    whenAvoid: ["landing ultra minimalista sem necessidade", "site de banco ou gestão pesada"],
    compatibleSegments: ["imobiliaria", "saas", "agencia", "restaurante"],
    compatibleExperiences: ["premium", "cinematic", "immersive", "luxury"],
    impactVisual: "alto",
    complexity: "média",
    estimatedContextCost: "baixo",
    requirements: ["hover ou fade controlado", "não exagerar em movimento"],
    recommendedCombinations: ["hero-cinematic", "product-showcase", "microinteractions"],
    tags: ["motion", "hover", "depth"],
  },
];

function normalizePatternTags(input?: string): string[] {
  return (input ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function scorePattern(pattern: CreativePattern, input: CreativePatternSelectionInput): number {
  const task = `${input.taskContext ?? ""} ${input.businessDna?.industry ?? ""} ${input.experienceDna?.preset ?? ""} ${input.blueprint?.experience ?? ""}`.toLowerCase();
  const businessKeywords = normalizePatternTags([
    input.businessDna?.industry,
    input.businessDna?.businessType,
    input.businessDna?.goals?.join(" "),
    input.businessDna?.modules?.join(" "),
    input.businessDna?.uxPatterns?.join(" "),
    input.businessDna?.visualPatterns?.join(" "),
    input.blueprint?.modules?.join(" "),
    input.blueprint?.priorities?.join(" "),
  ].join(" "));
  const taskKeywords = new Set(normalizePatternTags(task));
  const patternKeywords = new Set(normalizePatternTags([pattern.name, pattern.description, pattern.tags.join(" "), pattern.whenUse.join(" "), pattern.recommendedCombinations.join(" ")].join(" ")));

  let score = 0;

  for (const keyword of taskKeywords) {
    if (patternKeywords.has(keyword)) score += 4;
  }

  if (pattern.compatibleSegments.some((segment) => businessKeywords.includes(segment))) score += 3;
  if (input.experienceDna?.preset && pattern.compatibleExperiences.includes(input.experienceDna.preset)) score += 3;
  if (input.businessDna?.visualPatterns?.some((v) => pattern.tags.includes(v.toLowerCase()))) score += 2;
  if (input.blueprint?.priorities?.some((p) => pattern.tags.includes(p.toLowerCase()))) score += 2;

  if (task.includes("hero") && pattern.category === "hero") score += 4;
  if (task.includes("cta") && pattern.category === "cta") score += 4;
  if (/(catalog|catalogo|listagem|imovel|imovel|produto|showcase)/.test(task) && pattern.category === "product-showcase") score += 5;
  if (/(servico|beneficio|diferencial|cards)/.test(task) && pattern.category === "cards") score += 3;
  if (/(depoimento|prova|testemunho|social proof)/.test(task) && pattern.category === "testimonials") score += 3;

  if (input.businessDna?.industry === "imobiliaria" && pattern.id === "hero-cinematic") score += 5;
  if (input.businessDna?.industry === "imobiliaria" && pattern.id === "product-showcase") score += 5;
  if (input.businessDna?.industry === "imobiliaria" && pattern.id === "cta-premium") score += 3;

  if (input.businessDna?.industry === "restaurante" && pattern.id === "cta-premium") score += 3;
  if (input.businessDna?.industry === "restaurante" && pattern.id === "cards-bento") score += 2;

  return score;
}

function buildPriorityPatternIds(input: CreativePatternSelectionInput): string[] {
  const task = `${input.taskContext ?? ""} ${input.businessDna?.industry ?? ""}`.toLowerCase();
  const desired: string[] = [];

  if (task.includes("hero") || task.includes("imobili") || task.includes("catalog") || task.includes("produto")) {
    desired.push("hero-cinematic");
    desired.push("product-showcase");
    desired.push("cta-premium");
  }

  if (task.includes("servico") || task.includes("beneficio") || task.includes("cards")) {
    desired.push("cards-bento");
  }

  if (task.includes("depoimento") || task.includes("prova") || task.includes("testemunho")) {
    desired.push("testimonials-proof");
  }

  if (task.includes("cta") || task.includes("agendar") || task.includes("reservar") || task.includes("comprar")) {
    desired.push("cta-premium");
  }

  return desired;
}

function ensureComplementarySelection(scored: Array<{ pattern: CreativePattern; score: number }>, maxPatterns: number, input: CreativePatternSelectionInput): CreativePattern[] {
  const selected: CreativePattern[] = [];
  const seenCategories = new Set<string>();
  const priorityIds = new Set(buildPriorityPatternIds(input));

  const priorityFirst = scored.filter(({ pattern }) => priorityIds.has(pattern.id));
  const remaining = scored.filter(({ pattern }) => !priorityIds.has(pattern.id));

  for (const item of [...priorityFirst, ...remaining]) {
    if (selected.length >= maxPatterns) break;
    if (seenCategories.has(item.pattern.category)) continue;
    selected.push(item.pattern);
    seenCategories.add(item.pattern.category);
  }

  if (selected.length >= maxPatterns) return selected;

  for (const item of scored) {
    if (selected.length >= maxPatterns) break;
    if (!selected.some((pattern) => pattern.id === item.pattern.id)) selected.push(item.pattern);
  }

  return selected;
}

export function selectCreativePatterns(input: CreativePatternSelectionInput): CreativePattern[] {
  const maxPatterns = Math.max(1, Math.min(input.maxPatterns ?? 3, CREATIVE_PATTERN_LIBRARY.length));
  const scored = CREATIVE_PATTERN_LIBRARY.map((pattern) => ({
    pattern,
    score: scorePattern(pattern, input),
  }))
    .sort((a, b) => b.score - a.score);

  return ensureComplementarySelection(scored, maxPatterns, input);
}

export function formatCreativePatternsForPrompt(patterns: CreativePattern[]): string {
  const lines = patterns.map((pattern) => {
    const parts = [
      `- ${pattern.id}: ${pattern.name}`,
      `  categoria: ${pattern.category}`,
      `  uso: ${pattern.whenUse.join("; ")}`,
      `  combinar: ${pattern.recommendedCombinations.join(" -> ")}`,
      `  evitar: ${pattern.whenAvoid.join("; ")}`,
    ];

    return parts.join("\n");
  });

  return ["PATTERNS CRIATIVOS SELECIONADOS (apenas os relevantes):", ...lines, ""].join("\n");
}
