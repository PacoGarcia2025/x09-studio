import { businessDnaSchema } from "@/lib/dna/schemas";
import type { BusinessDNA, BusinessIndustry } from "@/lib/dna/types";

const BUSINESS_DNA_REGISTRY: Record<BusinessIndustry, BusinessDNA> = {
  generic: {
    industry: "generic",
    businessType: "generic",
    audience: ["clientes"],
    goals: ["apresentar valor", "converter leads", "organizar operação"],
    modules: ["apresentação", "serviços", "contato", "admin"],
    entities: ["cliente", "contato", "pedido"],
    workflows: ["cadastro", "gestão", "atendimento"],
    integrations: ["supabase"],
    uxPatterns: ["simples", "claro", "direto"],
    visualPatterns: ["limpo", "moderno", "confiável"],
    rules: ["manter navegação simples", "priorizar conversão"],
    source: "registry",
    confidence: 0.8,
  },
  imobiliaria: {
    industry: "imobiliaria",
    businessType: "real_estate",
    audience: ["compradores", "locatários", "investidores", "corretores"],
    goals: ["exibir imóveis", "qualificar leads", "agendar visitas", "vender ou alugar"],
    modules: ["home", "catalogo", "detalhes", "lead capture", "crm", "admin"],
    entities: ["imovel", "cliente", "lead", "visita", "agendamento", "corretor"],
    workflows: ["busca", "filtro", "agendamento", "negociação", "gestão de leads"],
    integrations: ["supabase", "whatsapp", "crm", "mapa"],
    uxPatterns: ["busca por filtros", "cards premium", "cta forte", "navegação clara"],
    visualPatterns: ["luxo", "minimalista", "premium", "alto contraste"],
    rules: ["destacar localização e valor", "foco em conversão e credibilidade"],
    source: "registry",
    confidence: 0.9,
  },
  salon_beauty: {
    industry: "salon_beauty",
    businessType: "beauty_service",
    audience: ["clientes", "mulheres", "familias", "grupos"],
    goals: ["agendar serviços", "vender pacotes", "mostrar portfólio", "repetição de compra"],
    modules: ["home", "serviços", "galeria", "agendamento", "promoções", "clientes"],
    entities: ["cliente", "serviço", "agendamento", "profissional", "promoção"],
    workflows: ["descoberta", "agendamento", "reagendamento", "avaliação"],
    integrations: ["supabase", "whatsapp", "agenda"],
    uxPatterns: ["visual elegante", "cards de serviços", "CTA de agendamento", "galeria forte"],
    visualPatterns: ["clean luxury", "tons suaves", "fotografia premium"],
    rules: ["foco em autoestima e confiança", "mostrar antes e depois"],
    source: "registry",
    confidence: 0.9,
  },
  barbearia: {
    industry: "barbearia",
    businessType: "personal_care",
    audience: ["homens", "clientes recorrentes", "grupos de amigos"],
    goals: ["agendar cortes", "mostrar portfólio", "vender pacotes", "construir recorrência"],
    modules: ["home", "serviços", "preços", "agendamento", "galeria", "contato"],
    entities: ["cliente", "serviço", "agendamento", "barbeiro", "promoção"],
    workflows: ["descoberta", "agendamento", "check-in", "avaliação"],
    integrations: ["supabase", "whatsapp", "agenda"],
    uxPatterns: ["minimalista", "direto", "convite para agendar", "visual forte"],
    visualPatterns: ["preto e dourado", "minimal", "cinematic"],
    rules: ["mostrar estilo e qualidade", "priorizar rapidez de agendamento"],
    source: "registry",
    confidence: 0.9,
  },
  restaurante: {
    industry: "restaurante",
    businessType: "food_service",
    audience: ["clientes locais", "grupos", "famílias", "delivery"],
    goals: ["exibir menu", "vender pratos", "reservar mesa", "gerenciar pedidos"],
    modules: ["home", "cardapio", "reservas", "pedidos", "sobre", "contato"],
    entities: ["prato", "pedido", "cliente", "mesa", "reserva", "categoria"],
    workflows: ["explorar menu", "reservar", "fazer pedido", "entrega"],
    integrations: ["supabase", "pedido online", "whatsapp", "pagamento"],
    uxPatterns: ["menu visual", "destacando pratos", "cta de pedidos", "UX clara"],
    visualPatterns: ["apetitoso", "warm", "editorial", "premium"],
    rules: ["mostrar qualidade do prato e experiência", "evitar ruído visual"],
    source: "registry",
    confidence: 0.9,
  },
  hamburgueria: {
    industry: "hamburgueria",
    businessType: "food_service",
    audience: ["clientes locais", "delivery", "familias", "grupos"],
    goals: ["vender hambúrgueres", "administrar pedidos", "gerenciar clientes", "organizar entregas"],
    modules: ["cardapio", "pedidos", "clientes", "entregas", "financeiro", "admin"],
    entities: ["produto", "pedido", "cliente", "entrega", "categoria", "cupom"],
    workflows: ["cardápio", "pedido", "entrega", "pagamento", "relatório"],
    integrations: ["supabase", "whatsapp", "delivery", "pagamento"],
    uxPatterns: ["cartões de produto", "cta de pedido", "UI rápida", "foco em conversão"],
    visualPatterns: ["quente", "bold", "dinâmica", "high contrast"],
    rules: ["dar destaque ao produto e à velocidade", "manter pedidos e produção bem organizados"],
    source: "registry",
    confidence: 0.94,
  },
  saas: {
    industry: "saas",
    businessType: "software",
    audience: ["gestores", "equipes", "clientes", "admins"],
    goals: ["vender software", "melhorar operação", "automatizar processos", "centralizar dados"],
    modules: ["landing", "dashboard", "clientes", "relatórios", "admin", "billing"],
    entities: ["cliente", "usuário", "assinatura", "pedido", "relatório", "projeto"],
    workflows: ["cadastro", "uso do produto", "relatórios", "gestão"],
    integrations: ["supabase", "billing", "auth", "analytics"],
    uxPatterns: ["dashboard enxuto", "foco em produtividade", "navegação por módulo"],
    visualPatterns: ["clean tech", "minimalista", "profissional", "contraste moderado"],
    rules: ["priorizar clareza e produtividade", "não exagerar em efeitos visuais"],
    source: "registry",
    confidence: 0.88,
  },
  game: {
    industry: "game",
    businessType: "entertainment",
    audience: ["jogadores", "comunidade", "streamers", "fans"],
    goals: ["apresentar jogo", "converter wishlists", "engajar comunidade", "mostrar gameplay"],
    modules: ["home", "gameplay", "personagens", "notícias", "loja", "comunidade"],
    entities: ["jogador", "personagem", "guilda", "missão", "loja", "evento"],
    workflows: ["descoberta", "exploração", "progresso", "comunidade"],
    integrations: ["supabase", "analytics", "leaderboards"],
    uxPatterns: ["imersivo", "cinematic", "navigation energizante", "storytelling"],
    visualPatterns: ["futuristic", "dinâmico", "immersive", "impactante"],
    rules: ["usar narrativa e atmosfera", "manter foco em exploração e engajamento"],
    source: "registry",
    confidence: 0.8,
  },
};

export function getBusinessDnaRegistry(): Record<BusinessIndustry, BusinessDNA> {
  return BUSINESS_DNA_REGISTRY;
}

export function resolveBusinessDna(prompt: string): BusinessDNA {
  const text = prompt.trim();
  if (!text) {
    return businessDnaSchema.parse(BUSINESS_DNA_REGISTRY.generic);
  }

  const industry = detectBusinessIndustry(text);
  const item = BUSINESS_DNA_REGISTRY[industry];
  return businessDnaSchema.parse({
    ...item,
    source: item.source,
    confidence: item.confidence,
  });
}

export function detectBusinessIndustry(prompt: string): BusinessIndustry {
  const text = prompt.toLowerCase();

  if (/(imobili|imovel|corretor|venda de imóveis|aluguel|condominio|apartamento|casa)/i.test(text)) {
    return "imobiliaria";
  }
  if (/(sal[aã]o|beleza|beauty|cabelo|cabeleireiro|manicure|pedicure|maquiagem)/i.test(text)) {
    return "salon_beauty";
  }
  if (/(barbearia|barbeiro|corte|estilo|fade|navalha)/i.test(text)) {
    return "barbearia";
  }
  if (/(restaurante|cardapio|prato|mesa|cozinha|delivery|pizza)/i.test(text)) {
    return "restaurante";
  }
  if (/(hamburguer|burger|lanche|delivery|cardapio|hamburguesa)/i.test(text)) {
    return "hamburgueria";
  }
  if (/(saas|crm|dashboard|erp|gest[aã]o|backoffice|plataforma|software|sistema)/i.test(text)) {
    return "saas";
  }
  if (/(game|jogo|gaming|rpg|multiplayer|playable|personagem|gameplay)/i.test(text)) {
    return "game";
  }

  return "generic";
}

export function describeBusinessDna(dna: BusinessDNA): string {
  return JSON.stringify(
    {
      industry: dna.industry,
      businessType: dna.businessType,
      audience: dna.audience,
      goals: dna.goals,
      modules: dna.modules,
      entities: dna.entities,
      workflows: dna.workflows,
      integrations: dna.integrations,
      uxPatterns: dna.uxPatterns,
      visualPatterns: dna.visualPatterns,
      rules: dna.rules,
      source: dna.source,
      confidence: dna.confidence,
    },
    null,
    2,
  );
}
