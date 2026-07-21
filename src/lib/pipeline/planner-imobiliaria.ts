import type { StudioPlan } from "@/lib/pipeline/plan-schema";
import { isImobiliaria360 } from "@/lib/skills/detect";

export { isImobiliaria360 as needsImobiliaria360 };

type TaskInsert = {
  id: string;
  path: string;
  title: string;
  instruction: string;
  dependsOn: string[];
};

/**
 * Injeta plano expandido (15–25 tasks) para portal imobiliário 360°.
 */
export function ensureImobiliaria360Tasks(
  plan: StudioPlan,
  prompt: string,
): StudioPlan {
  const brief = prompt.slice(0, 800);
  const tasks = [...plan.tasks];
  const pathOf = (p: string) =>
    tasks.findIndex((t) => t.path?.replace(/\\/g, "/") === p);

  const upsert = (input: TaskInsert, insertAt: number) => {
    const idx = pathOf(input.path);
    if (idx >= 0) {
      const current = tasks[idx]!;
      if (current.instruction.length < 120) {
        tasks[idx] = {
          ...current,
          instruction: `${current.instruction}\n\n${input.instruction}`,
          dependsOn: [...new Set([...current.dependsOn, ...input.dependsOn])],
        };
      }
      return current.id;
    }
    tasks.splice(insertAt, 0, {
      id: input.id,
      type: "update_file",
      title: input.title,
      instruction: input.instruction,
      path: input.path,
      dependsOn: input.dependsOn,
    });
    return input.id;
  };

  const propsId = upsert(
    {
      id: "t_imob_properties",
      path: "src/lib/properties.ts",
      title: "Mock de imóveis (8+ registros)",
      instruction: `Crie lib/properties.ts para: ${brief}. Type Property completo, MOCK_PROPERTIES com 8+ imóveis luxury (cobertura, penthouse, casa condomínio, apto beira-mar). Bairros/cidade do brief. getPropertyById, formatPriceBRL. Fotos Unsplash luxury.`,
      dependsOn: [],
    },
    0,
  );

  const homeId = upsert(
    {
      id: "t_imob_home",
      path: "src/pages/HomePage.tsx",
      title: "Home imobiliária premium",
      instruction: `HomePage imobiliária 360°: ${brief}. Hero vídeo/carrossel, smart search (Comprar/Alugar/Lançamentos), filtros, destaques exclusivos, lifestyle grid, social proof VGV, footer CRECI/NAP. Props: onNavigateToLogin, onNavigateListings, onSelectProperty. Luxury light se brief pedir ouro/off-white.`,
      dependsOn: [propsId],
    },
    1,
  );

  const listingsId = upsert(
    {
      id: "t_imob_listings",
      path: "src/pages/ListingsPage.tsx",
      title: "Catálogo + filtros + mapa mock",
      instruction: `ListingsPage: grid infinito + filtros laterais (amenidades, preço slider, tags lifestyle) + mapa mock com pins de preço. MOCK_PROPERTIES. onSelectProperty(id). Ordenação preço/recentes.`,
      dependsOn: [propsId, homeId],
    },
    2,
  );

  const detailId = upsert(
    {
      id: "t_imob_detail",
      path: "src/pages/PropertyDetailPage.tsx",
      title: "Detalhe imóvel imersivo",
      instruction: `PropertyDetailPage: galeria Apple-style, tour 360 iframe mock, calculadora financiamento, ficha técnica, mapa POIs, sticky box corretor (WhatsApp wa.me, agendar visita). propertyId prop.`,
      dependsOn: [propsId, listingsId],
    },
    3,
  );

  const loginId = upsert(
    {
      id: "t_imob_login",
      path: "src/pages/LoginPage.tsx",
      title: "Login multi-persona",
      instruction: `LoginPage Supabase auth real. Toggle entrar/cadastrar. Após login: callbacks onNavigateBroker, onNavigateOwner, onNavigateAdmin ou seletor persona. Visual luxury alinhado ao brief: ${brief.slice(0, 200)}.`,
      dependsOn: [homeId],
    },
    4,
  );

  const brokerId = upsert(
    {
      id: "t_imob_broker",
      path: "src/pages/BrokerDashboardPage.tsx",
      title: "CRM corretor",
      instruction: `BrokerDashboardPage: funil Novo Lead→Visita→Proposta→Fechado, lista leads, cadastro imóvel rápido, KPIs. useState + mock denso.`,
      dependsOn: [propsId, loginId],
    },
    5,
  );

  const ownerId = upsert(
    {
      id: "t_imob_owner",
      path: "src/pages/OwnerPortalPage.tsx",
      title: "Portal proprietário",
      instruction: `OwnerPortalPage: visualizações anúncio, propostas recebidas, visitas agendadas. Gráficos CSS simples.`,
      dependsOn: [loginId],
    },
    6,
  );

  const adminId = upsert(
    {
      id: "t_imob_admin",
      path: "src/pages/AdminDashboardPage.tsx",
      title: "Admin BI multi-corretor",
      instruction: `AdminDashboardPage: KPIs VGV/comissões, tabela corretores, gráfico vendas. Mock BI premium.`,
      dependsOn: [loginId],
    },
    7,
  );

  upsert(
    {
      id: "t_imob_app",
      path: "src/App.tsx",
      title: "App multi-página imobiliária",
      instruction: `App.tsx: useState page home|listings|property|login|broker|owner|admin + selectedPropertyId. Wire todas as páginas. Login roteia para broker/owner/admin. SEM AppShell.`,
      dependsOn: [homeId, listingsId, detailId, loginId, brokerId, ownerId, adminId],
    },
    8,
  );

  const pages = [
    { path: "/", name: "Home", description: "Portal imobiliário — busca e destaques" },
    { path: "/imoveis", name: "Catálogo", description: "Listagem com filtros e mapa" },
    { path: "/imovel/:id", name: "Detalhe", description: "Experiência de venda do imóvel" },
    { path: "/login", name: "Login", description: "Auth multi-persona" },
    { path: "/corretor", name: "CRM Corretor", description: "Gestão de leads e carteira" },
    { path: "/proprietario", name: "Portal Proprietário", description: "Relatórios do anúncio" },
    { path: "/admin", name: "Admin", description: "BI e multi-corretor" },
  ];

  return {
    ...plan,
    pages,
    tasks: tasks.slice(0, 45),
  };
}
