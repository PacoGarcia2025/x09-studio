import { resolveBusinessDna } from "@/lib/dna/business-dna";
import { resolveExperienceDna } from "@/lib/dna/experience-dna";
import { blueprintSchema, type Blueprint } from "@/lib/dna/schemas";

export type BlueprintOptions = {
  hasExistingApp?: boolean;
  productTypeOverride?: string;
};

function inferProductType(prompt: string, industry: string): Blueprint["productType"] {
  const text = prompt.toLowerCase();
  let inferred: Blueprint["productType"] = "generic";

  if (/(sistema|software|app|aplicativo|dashboard|crm|gest[aã]o|painel|plataforma|delivery|pedidos|loja|e-commerce)/i.test(text)) {
    inferred = "application";
  } else if (/(saas|subscription|assinatura|b2b)/i.test(text)) {
    inferred = "saas";
  } else if (/(portal|imobiliaria|imóvel|imovel)/i.test(industry)) {
    inferred = "portal";
  } else if (/(game|jogo|gaming|rpg)/i.test(text)) {
    inferred = "game";
  } else if (/(site|landing page|landing|home page|website|webpage|página inicial)/i.test(text)) {
    inferred = "website";
  }

  return inferred;
}

function derivePages(productType: Blueprint["productType"], industry: string): Blueprint["pages"] {
  const base = [
    { id: "home", title: "Home", route: "/", purpose: "Apresentação principal e CTA" },
  ];

  if (industry === "hamburgueria" || industry === "restaurante") {
    return [
      ...base,
      { id: "cardapio", title: "Cardápio", route: "/cardapio", purpose: "Produtos e categorias" },
      { id: "pedidos", title: "Pedidos", route: "/pedidos", purpose: "Gestão de pedidos e entregas" },
      { id: "clientes", title: "Clientes", route: "/clientes", purpose: "Registro e recorrência" },
      { id: "dashboard", title: "Painel Admin", route: "/dashboard", purpose: "Gestão do restaurante" },
    ];
  }

  if (productType === "website") {
    return [
      ...base,
      { id: "sobre", title: "Sobre", route: "/sobre", purpose: "Narrativa e credibilidade" },
      { id: "servicos", title: "Serviços", route: "/servicos", purpose: "Apresentação de entregas" },
      { id: "contato", title: "Contato", route: "/contato", purpose: "Captação e conversão" },
    ];
  }

  if (productType === "portal" || productType === "application") {
    return [
      ...base,
      { id: "dashboard", title: "Dashboard", route: "/dashboard", purpose: "Visão geral e operação" },
      { id: "clientes", title: "Clientes", route: "/clientes", purpose: "Gestão de clientes e leads" },
      { id: "relatorios", title: "Relatórios", route: "/relatorios", purpose: "Indicadores e visão executiva" },
    ];
  }

  return base;
}

function deriveEntities(industry: string): string[] {
  switch (industry) {
    case "hamburgueria":
      return ["produto", "pedido", "cliente", "entrega", "categoria"];
    case "restaurante":
      return ["prato", "pedido", "cliente", "reserva", "mesa"];
    case "imobiliaria":
      return ["imovel", "lead", "cliente", "visita", "corretor"];
    case "salon_beauty":
      return ["servico", "cliente", "agendamento", "profissional"];
    case "barbearia":
      return ["servico", "cliente", "agendamento", "barbeiro"];
    case "saas":
      return ["cliente", "usuario", "assinatura", "projeto", "relatorio"];
    case "game":
      return ["jogador", "personagem", "missao", "guilda", "evento"];
    default:
      return ["cliente", "pedido", "servico"];
  }
}

function deriveWorkflows(industry: string): string[] {
  switch (industry) {
    case "hamburgueria":
      return ["cardapio", "pedido", "entrega", "pagamento", "relatorio"];
    case "restaurante":
      return ["menu", "pedido", "reserva", "entrega", "atendimento"];
    case "imobiliaria":
      return ["busca", "qualificação", "visita", "negociação", "crm"];
    case "salon_beauty":
      return ["agendamento", "atendimento", "avaliação", "recorrência"];
    case "barbearia":
      return ["agendamento", "corte", "check-in", "feedback"];
    default:
      return ["cadastro", "gestão", "relatório", "atendimento"];
  }
}

function deriveIntegrations(industry: string): string[] {
  switch (industry) {
    case "hamburgueria":
      return ["supabase", "whatsapp", "pagamento", "delivery"];
    case "restaurante":
      return ["supabase", "whatsapp", "reserva", "pagamento"];
    case "imobiliaria":
      return ["supabase", "whatsapp", "crm", "mapa"];
    case "salon_beauty":
      return ["supabase", "whatsapp", "agenda"];
    case "barbearia":
      return ["supabase", "whatsapp", "agenda"];
    case "saas":
      return ["supabase", "auth", "billing", "analytics"];
    case "game":
      return ["supabase", "analytics", "leaderboards"];
    default:
      return ["supabase"];
  }
}

export function resolveBlueprint(
  prompt: string,
  options: BlueprintOptions = {},
): Blueprint {
  const business = resolveBusinessDna(prompt);
  const experience = resolveExperienceDna(prompt);

  const industry = business.industry;
  const productType =
    (options.productTypeOverride as Blueprint["productType"] | undefined) ??
    inferProductType(prompt, industry);

  const pages = derivePages(productType, industry);
  const modules = Array.from(
    new Set([
      ...business.modules,
      ...(productType === "website" ? ["landing", "serviços", "contato"] : []),
      ...(productType === "application" || productType === "saas" || productType === "portal"
        ? ["dashboard", "cliente", "relatórios", "admin"]
        : []),
    ]),
  );

  const fallbackUsed = industry === "generic" || experience.preset === "generic";
  const blueprint: Blueprint = {
    industry: business.industry,
    productType,
    experience: experience.preset,
    summary: `${business.businessType} com experiência ${experience.preset} para ${business.industry === "generic" ? "um negócio genérico" : business.industry}.`,
    modules,
    pages,
    entities: deriveEntities(industry),
    workflows: deriveWorkflows(industry),
    integrations: deriveIntegrations(industry),
    ux: {
      tone: experience.summary,
      conversionFocus: true,
      mobileFirst: true,
      accessibility: true,
    },
    visual: {
      palette: experience.visual.palette,
      typography: experience.visual.typography,
      motion: experience.visual.motion,
    },
    technical: {
      stack: ["Vite", "React", "TypeScript", "Supabase"],
      authRequired: productType === "application" || productType === "saas" || productType === "portal",
      persistence: ["supabase", "filesystem safe"],
    },
    priorities: [
      "clareza",
      "ux profissional",
      "operação eficiente",
      "conversão e valor percebido",
    ],
    constraints: [
      "manter compatibilidade com o fluxo atual",
      "não provocar regressão de projetos existentes",
      "preservar arquitetura existente quando houver projeto em andamento",
    ],
    preserveExistingArchitecture: Boolean(options.hasExistingApp) || true,
    fallbackUsed,
    source: "heuristic",
    confidence: Math.min(0.98, business.confidence * 0.8 + experience.confidence * 0.2),
  };

  return blueprintSchema.parse(blueprint);
}

export function formatBlueprintForPrompt(blueprint: Blueprint): string {
  return JSON.stringify(
    {
      industry: blueprint.industry,
      productType: blueprint.productType,
      experience: blueprint.experience,
      summary: blueprint.summary,
      modules: blueprint.modules,
      pages: blueprint.pages,
      entities: blueprint.entities,
      workflows: blueprint.workflows,
      integrations: blueprint.integrations,
      ux: blueprint.ux,
      visual: blueprint.visual,
      technical: blueprint.technical,
      priorities: blueprint.priorities,
      constraints: blueprint.constraints,
      preserveExistingArchitecture: blueprint.preserveExistingArchitecture,
      fallbackUsed: blueprint.fallbackUsed,
      confidence: blueprint.confidence,
    },
    null,
    2,
  );
}

export function logBlueprintDecision(blueprint: Blueprint): void {
  console.info(
    `[dna][blueprint] industry=${blueprint.industry} experience=${blueprint.experience} productType=${blueprint.productType} fallback=${String(blueprint.fallbackUsed)}`,
  );
}
