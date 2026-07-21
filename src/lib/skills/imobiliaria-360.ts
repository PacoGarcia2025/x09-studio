import { briefMissingFromContent } from "@/lib/pipeline/brief-context";
import { isLuxuryLight } from "@/lib/skills/detect";
import { lacksCinematicQuality } from "@/lib/skills/premium-design";
import { lacksLuxuryLightQuality } from "@/lib/skills/luxury-light";
import type { SkillQualityIssue, StudioSkill } from "@/lib/skills/types";

export const IMOBILIARIA_PAGES = [
  "src/pages/HomePage.tsx",
  "src/pages/ListingsPage.tsx",
  "src/pages/PropertyDetailPage.tsx",
  "src/pages/LoginPage.tsx",
  "src/pages/BrokerDashboardPage.tsx",
  "src/pages/OwnerPortalPage.tsx",
  "src/pages/AdminDashboardPage.tsx",
  "src/lib/properties.ts",
  "src/App.tsx",
] as const;

export const LISTINGS_PAGE_BASE = `Você gera ListingsPage (catálogo de imóveis) Vite + React + TypeScript.
Responda APENAS JSON: { "content": string }.
- export function ListingsPage({ onNavigateHome, onSelectProperty }: { onNavigateHome?: () => void; onSelectProperty?: (id: string) => void })
- import { MOCK_PROPERTIES, type Property } from "../lib/properties"
- Layout split: grid de cards + painel lateral de filtros (tipo, quartos, preço slider, tags lifestyle).
- Mapa mock: div com pins simulados (position absolute) ou grid com ícones MapPin + preço — não precisa Leaflet real.
- Ordenação: Menor preço | Maior preço | Mais recentes.
- Cards: foto Unsplash, badge Exclusividade, metragem, quartos, vagas, preço formatado BRL.
- Skeleton loaders ao filtrar (animate-pulse).
- TSX válido e denso (~120+ linhas).`;

export const PROPERTY_DETAIL_BASE = `Você gera PropertyDetailPage (detalhe do imóvel) Vite + React + TypeScript.
Responda APENAS JSON: { "content": string }.
- export function PropertyDetailPage({ propertyId, onNavigateBack, onNavigateListings }: { propertyId: string; onNavigateBack?: () => void; onNavigateListings?: () => void })
- import { getPropertyById } from "../lib/properties"
- Galeria estilo Apple: foto principal + mosaico lateral + botão tela cheia (useState).
- Embed Matterport/YouTube: iframe mock com src placeholder ou botão "Tour 360°".
- Calculadora financiamento: sliders entrada + prazo → parcela estimada (useState).
- Ficha técnica: IPTU, condomínio, área, suítes, vagas (ícones lucide).
- Mapa localização mock + POIs (escolas, restaurantes).
- Sticky sidebar: foto corretor, Agendar Visita (date input), WhatsApp 1-clique (wa.me), Simular Proposta.
- TSX válido (~150+ linhas).`;

export const BROKER_DASHBOARD_BASE = `Você gera BrokerDashboardPage (CRM corretor) Vite + React + TypeScript.
Responda APENAS JSON: { "content": string }.
- export function BrokerDashboardPage({ onNavigateHome, onSignOut }: props)
- Funil kanban ou colunas: Novo Lead | Visita Agendada | Proposta | Fechado.
- Lista leads com nome, imóvel, status, última interação.
- Form cadastro rápido imóvel (título, preço, tipo, bairro).
- KPIs: leads ativos, visitas semana, propostas abertas.
- useState + mock seed; getSupabase opcional.
- Visual premium alinhado ao brief (~150+ linhas).`;

export const OWNER_PORTAL_BASE = `Você gera OwnerPortalPage (portal proprietário) Vite + React + TypeScript.
Responda APENAS JSON: { "content": string }.
- export function OwnerPortalPage({ onNavigateHome, onSignOut }: props)
- Relatório visualizações do anúncio (gráfico simples ou barras CSS).
- Propostas recebidas (tabela status/valor).
- Visitas agendadas (lista datas).
- useState + dados mock realistas (~100+ linhas).`;

export const ADMIN_DASHBOARD_BASE = `Você gera AdminDashboardPage (admin multi-corretor) Vite + React + TypeScript.
Responda APENAS JSON: { "content": string }.
- export function AdminDashboardPage({ onNavigateHome, onSignOut }: props)
- KPIs BI: VGV, imóveis carteira, corretores ativos, comissões mês.
- Tabela corretores com performance.
- Gráfico vendas (barras CSS ou recharts se disponível).
- useState + mock (~120+ linhas).`;

export const PROPERTIES_LIB_BASE = `Você gera src/lib/properties.ts com dados mock imobiliários realistas.
Responda APENAS JSON: { "content": string }.
- export type Property = { id, slug, title, type, neighborhood, city, price, rent?, bedrooms, suites, parking, area, tags: string[], images: string[], description, iptu?, condo?, brokerName, brokerPhone, featured }
- export const MOCK_PROPERTIES: Property[] — mínimo 8 imóveis variados (cobertura, casa, apto, lançamento).
- export function getPropertyById(id: string): Property | undefined
- export function formatPriceBRL(n: number): string
- URLs Unsplash luxury; bairros/cidades do brief quando citados.`;

export const IMOBILIARIA_APP_TSX_RULES = `Você gera src/App.tsx multi-página imobiliária Vite + React.
Responda APENAS JSON: { "content": string }.
- useState para page: "home" | "listings" | "property" | "login" | "broker" | "owner" | "admin"
- useState selectedPropertyId: string | null
- Importe HomePage, ListingsPage, PropertyDetailPage, LoginPage, BrokerDashboardPage, OwnerPortalPage, AdminDashboardPage
- Home → onNavigateListings, onNavigateToLogin, onSelectProperty
- Login → onNavigateBroker/onNavigateOwner/onNavigateAdmin conforme role mock OU onNavigateApp → broker
- SEM react-router, SEM AppShell, SEM "Meu App".`;

export const x09Imobiliaria360Skill: StudioSkill = {
  id: "x09-imobiliaria-360",
  name: "Imobiliária 360°",
  plannerRules: `
- Tipo: PORTAL IMOBILIÁRIO COMPLETO — mínimo 15 tasks, máximo 25.
- Páginas OBRIGATÓRIAS:
  1. src/lib/properties.ts — mock 8+ imóveis
  2. src/App.tsx — roteamento multi-página (home|listings|property|login|broker|owner|admin)
  3. src/pages/HomePage.tsx — hero + smart search + destaques + lifestyle
  4. src/pages/ListingsPage.tsx — catálogo + filtros + mapa mock
  5. src/pages/PropertyDetailPage.tsx — galeria + financiamento + sticky contact
  6. src/pages/LoginPage.tsx — auth Supabase + redirect por persona
  7. src/pages/BrokerDashboardPage.tsx — CRM funil + cadastro imóvel
  8. src/pages/OwnerPortalPage.tsx — relatórios proprietário
  9. src/pages/AdminDashboardPage.tsx — BI multi-corretor
- dependsOn: properties.ts antes das páginas; App.tsx por último ou após páginas.
- auth.roles: ["visitor","buyer","broker","owner","admin"]
- database.tables: properties, leads, visits, proposals (mock ok se sem migration)
`.trim(),
  builderFileRules: `
Integrações imobiliárias:
- WhatsApp: https://wa.me/55{DDD}{NUMERO}?text= codificado
- Embed tour: iframe YouTube/Matterport placeholder com title acessível
- Cookie consent banner simples no footer (LGPD mock)
- Links tel: e mailto: nos contatos
`.trim(),
  homePageRules: `
HOME IMOBILIÁRIA 360°:
- export function HomePage({ onNavigateToLogin?, onNavigateListings?, onSelectProperty? })
- Hero: vídeo/carrossel imóveis luxo + smart search (abas Comprar/Alugar/Lançamentos/Temporada).
- Filtros inline: localização, tipo, preço slider, quartos, vagas, tags lifestyle.
- Seção Destaques da Semana: cards com carousel hover, badges Exclusividade/Penthouse.
- Seção Busca por Estilo de Vida: grid categorias (coberturas, condomínio, beira-mar).
- Social proof: VGV, imóveis carteira, anos tradição.
- Footer NAP + CRECI + links catálogo.
`.trim(),
  loginPageRules: `
- Login com seleção de persona (Corretor | Proprietário | Admin) OU redirect broker após auth.
- getSupabase().auth real; após login chame callback correto (onNavigateBroker etc.).
`.trim(),
  dashboardPageRules: BROKER_DASHBOARD_BASE,
  editRules: `
- Preserve arquitetura multi-página imobiliária e MOCK_PROPERTIES.
- Não remova funil CRM, sticky contact box ou smart search.
`.trim(),
  evaluateHome(home, brief) {
    const qualityFn = isLuxuryLight(brief)
      ? lacksLuxuryLightQuality
      : lacksCinematicQuality;
    const issues: SkillQualityIssue[] = qualityFn(home).map((message) => ({
      code: "imob_home_premium",
      message,
      severity: "error" as const,
      penalty: 15,
    }));

    if (!/onNavigateListings|listings|cat[aá]logo|im[oó]veis/i.test(home)) {
      issues.push({
        code: "imob_no_catalog_link",
        message: "Home imobiliária deve linkar para catálogo/listagens",
        severity: "warn" as const,
        penalty: 10,
      });
    }

    if (brief.trim()) {
      for (const msg of briefMissingFromContent(brief, home)) {
        issues.push({
          code: "brief_mismatch",
          message: msg,
          severity: "error",
          penalty: 18,
        });
      }
    }

    return issues;
  },
};
