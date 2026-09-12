import { experienceDnaSchema } from "@/lib/dna/schemas";
import type { ExperienceDNA, ExperiencePreset } from "@/lib/dna/types";

const EXPERIENCE_REGISTRY: Record<ExperiencePreset, ExperienceDNA> = {
  premium: {
    preset: "premium",
    summary: "Visual elegante, refinado, com foco em clareza, contraste e credibilidade.",
    visual: {
      tone: "premium",
      palette: ["#0F172A", "#F8FAFC", "#F59E0B", "#E2E8F0"],
      typography: "font-sans com escala clara e elegante",
      density: "moderada",
      motion: "subtil e profissional",
    },
    interaction: {
      microInteractions: true,
      storytelling: true,
      conversionFocus: true,
      accessibility: true,
    },
    direction: {
      artDirection: "premium, limpo e com identidade forte sem excesso",
      storytelling: "narrativa curta, clara e confiável, com foco em valor e prova social",
      interaction: "microinterações discretas, feedback útil e transitions suaves",
      conversion: "CTA visível e recorrente, com hierarquia de ação clara",
      antiGeneric: true,
      brandSignal: "identidade reconhecível por contraste, espaçamento e acabamento premium",
    },
    navigation: ["hero", "benefícios", "propostas", "cta", "contato"],
    source: "registry",
    confidence: 0.85,
  },
  cinematic: {
    preset: "cinematic",
    summary: "Narrativa visual forte, hero impactante, motion elegante e destaque para marca.",
    visual: {
      tone: "cinematic",
      palette: ["#0B1020", "#F5F5F5", "#F97316", "#7C3AED"],
      typography: "headline forte e moderna",
      density: "media",
      motion: "gradual e dramático",
    },
    interaction: {
      microInteractions: true,
      storytelling: true,
      conversionFocus: true,
      accessibility: true,
    },
    direction: {
      artDirection: "cinematic, dramático e com hero impactante",
      storytelling: "sequência narrativa visual forte com foco em emoção e prova",
      interaction: "transições suaves e elementos que guiam o olhar",
      conversion: "CTA forte após a impressão inicial, sem perder a narrativa",
      antiGeneric: true,
      brandSignal: "marca com presença visual marcante e memorável",
    },
    navigation: ["hero", "story", "serviços", "diferenciais", "cta"],
    source: "registry",
    confidence: 0.87,
  },
  editorial: {
    preset: "editorial",
    summary: "Design com narrativa editorial, hierarquia forte e apresentação refinada.",
    visual: {
      tone: "editorial",
      palette: ["#111827", "#F8F7F3", "#B45309", "#E5E7EB"],
      typography: "serif + sans para contraste editorial",
      density: "moderada",
      motion: "suave e elegante",
    },
    interaction: {
      microInteractions: true,
      storytelling: true,
      conversionFocus: true,
      accessibility: true,
    },
    direction: {
      artDirection: "editorial, sofisticado e com hierarquia narrativa",
      storytelling: "apresentação em camadas com narrativa visual e contexto de valor",
      interaction: "feedback sutil, leitura agradável e foco na descoberta",
      conversion: "CTA claro onde a intenção do usuário se torna ação",
      antiGeneric: true,
      brandSignal: "credibilidade e destaque por contraste editorial e clareza",
    },
    navigation: ["cover", "história", "destaques", "cta", "contato"],
    source: "registry",
    confidence: 0.82,
  },
  luxury: {
    preset: "luxury",
    summary: "Acabamento refinado, luxo discreto, premium e alto valor percebido.",
    visual: {
      tone: "luxury",
      palette: ["#F8F4EE", "#C8A96B", "#1C1C1C", "#D4AF37"],
      typography: "elegante e sofisticada",
      density: "banho de ar",
      motion: "subtil e premium",
    },
    interaction: {
      microInteractions: true,
      storytelling: true,
      conversionFocus: true,
      accessibility: true,
    },
    direction: {
      artDirection: "luxury premium, discreto e memorável com acabamento sofisticado",
      storytelling: "narrativa de valor e exclusividade, sem exagero ou vazio visual",
      interaction: "microinterações elegantes e funcionais, sem poluição visual",
      conversion: "CTA premium com testemunhos, prova e incentivo enérgico mas discreto",
      antiGeneric: true,
      brandSignal: "marca percebida como premium por materiais, espaçamento e consistência visual",
    },
    navigation: ["hero", "destaques", "serviços", "provas", "cta"],
    source: "registry",
    confidence: 0.88,
  },
  futuristic: {
    preset: "futuristic",
    summary: "Visual tecnológico, dinâmico e com forte sensação de inovação.",
    visual: {
      tone: "futuristic",
      palette: ["#020617", "#38BDF8", "#7C3AED", "#E2E8F0"],
      typography: "moderna com alta legibilidade",
      density: "compacta",
      motion: "mais energia e movimento",
    },
    interaction: {
      microInteractions: true,
      storytelling: true,
      conversionFocus: true,
      accessibility: true,
    },
    direction: {
      artDirection: "futuristic com tecnologia visível, mas sem excesso aleatório",
      storytelling: "prova de inovação, evolução e clareza de benefício",
      interaction: "feedback rápido, interfaces dinâmicas e pistas de progresso",
      conversion: "CTA orientada a produto, valor e decisão de compra",
      antiGeneric: true,
      brandSignal: "sensação de pioneirismo por contraste, foco e precisão técnica",
    },
    navigation: ["hero", "features", "product", "proof", "cta"],
    source: "registry",
    confidence: 0.83,
  },
  minimal: {
    preset: "minimal",
    summary: "Foco em clareza, espaço, legibilidade e conversão direta.",
    visual: {
      tone: "minimal",
      palette: ["#FFFFFF", "#111827", "#E5E7EB", "#6B7280"],
      typography: "simples, clara, legível",
      density: "low",
      motion: "mínimo",
    },
    interaction: {
      microInteractions: true,
      storytelling: false,
      conversionFocus: true,
      accessibility: true,
    },
    direction: {
      artDirection: "minimal, preciso e sem ruído visual",
      storytelling: "foco em clareza, benefício e prova objetiva",
      interaction: "microinterações reduzidas e altamente úteis",
      conversion: "CTA exponencialmente visível e direta",
      antiGeneric: false,
      brandSignal: "marca reconhecida por simplicidade e confiabilidade",
    },
    navigation: ["hero", "benefícios", "serviços", "cta"],
    source: "registry",
    confidence: 0.8,
  },
  immersive: {
    preset: "immersive",
    summary: "Experiência mais envolvente, com atmosfera, camadas visuais e sensação de presença.",
    visual: {
      tone: "immersive",
      palette: ["#020617", "#0F172A", "#8B5CF6", "#F8FAFC"],
      typography: "grandes headlines e alto contraste",
      density: "alta",
      motion: "dinâmico e envolvente",
    },
    interaction: {
      microInteractions: true,
      storytelling: true,
      conversionFocus: true,
      accessibility: true,
    },
    direction: {
      artDirection: "immersive e envolvente, com profundidade visual e presença",
      storytelling: "narrativa envolvente que leva a pessoa a sentir a experiência",
      interaction: "movimento intencional e evidente, guiando atenção sem atrapalhar",
      conversion: "CTA em pontos de pico emocional e confirmação de intenção",
      antiGeneric: true,
      brandSignal: "marca percebida como memorável e inesquecível",
    },
    navigation: ["hero", "story", "proof", "cta"],
    source: "registry",
    confidence: 0.8,
  },
  conversion: {
    preset: "conversion",
    summary: "Foco direto em CTA, clareza e ação do usuário, sem excesso visual.",
    visual: {
      tone: "conversion",
      palette: ["#0F172A", "#F97316", "#F8FAFC", "#E2E8F0"],
      typography: "simples e forte",
      density: "compacta",
      motion: "fraco e funcional",
    },
    interaction: {
      microInteractions: true,
      storytelling: false,
      conversionFocus: true,
      accessibility: true,
    },
    direction: {
      artDirection: "conversion-first, direto e sem ruído visual",
      storytelling: "narrativa curta e focada em benefício e urgência legítima",
      interaction: "microinterações funcionais para reforçar ação",
      conversion: "CTA recorrente, proeminente e sempre alinhada com objetivo do usuário",
      antiGeneric: true,
      brandSignal: "marca distinguida por clareza, confiabilidade e decisão rápida",
    },
    navigation: ["hero", "benefícios", "depoimentos", "cta"],
    source: "registry",
    confidence: 0.84,
  },
  generic: {
    preset: "generic",
    summary: "Visual neutro, funcional, claro e seguro para qualquer segmento.",
    visual: {
      tone: "generic",
      palette: ["#0F172A", "#F8FAFC", "#E2E8F0", "#7C3AED"],
      typography: "sistema neutro",
      density: "moderada",
      motion: "sutil",
    },
    interaction: {
      microInteractions: true,
      storytelling: true,
      conversionFocus: true,
      accessibility: true,
    },
    direction: {
      artDirection: "generic e funcional, sem identidade forte",
      storytelling: "relato seguro e objetivo, sem tentar forçar emoção",
      interaction: "microinterações simples e não intrusivas",
      conversion: "CTA funcional e sem excesso",
      antiGeneric: false,
      brandSignal: "sem diferenciação forte, focado em segurança e utilidade",
    },
    navigation: ["hero", "conteúdo", "cta", "contato"],
    source: "registry",
    confidence: 0.72,
  },
};

export function resolveExperienceDna(prompt: string): ExperienceDNA {
  const text = prompt.trim();
  if (!text) {
    return experienceDnaSchema.parse(EXPERIENCE_REGISTRY.premium);
  }

  const preset = detectExperiencePreset(text);
  return experienceDnaSchema.parse(EXPERIENCE_REGISTRY[preset]);
}

export function detectExperiencePreset(prompt: string): ExperiencePreset {
  const text = prompt.toLowerCase();

  if (/(luxo|luxury|premium|alto padrao|high end)/i.test(text)) return "luxury";
  if (/(cinemat|cinematic|movie|filme|dramatico|impactante)/i.test(text)) return "cinematic";
  if (/(editorial|revista|magazine|storytelling)/i.test(text)) return "editorial";
  if (/(futuristic|futurista|tech|tecnologia|innov)/i.test(text)) return "futuristic";
  if (/(immersive|imersivo|3d|360|experiencia imersiva)/i.test(text)) return "immersive";
  if (/(minimal|minimalista|clean|limpo)/i.test(text)) return "minimal";
  if (/(conversao|venda|engenharia de conversao|conversion|cta)/i.test(text)) return "conversion";

  return "premium";
}

export function describeExperienceDna(dna: ExperienceDNA): string {
  return JSON.stringify(
    {
      preset: dna.preset,
      summary: dna.summary,
      visual: dna.visual,
      interaction: dna.interaction,
      direction: dna.direction,
      navigation: dna.navigation,
      source: dna.source,
      confidence: dna.confidence,
    },
    null,
    2,
  );
}
