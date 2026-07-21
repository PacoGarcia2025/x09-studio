import type { StudioSkill } from "@/lib/skills/types";

export const x09EnterprisePublishSkill: StudioSkill = {
  id: "x09-enterprise-publish",
  name: "Enterprise Publish (zero SaaS)",
  alwaysOn: true,
  plannerRules: `
- Inclua tasks para SEO/LGPD/acessibilidade quando portal imobiliário ou produto premium.
- Auth roles via Supabase user_metadata.role: "broker" | "owner" | "admin" | "buyer".
- Após signup, grave role no metadata; LoginPage roteia para dashboard correto.
`.trim(),
  builderFileRules: `
PERFORMANCE & IMAGENS (grátis):
- Unsplash SEMPRE com ?fm=webp&q=80 (ou &fm=webp&q=80).
- loading="lazy" decoding="async" em <img>.
- preconnect apenas se necessário — evite fontes externas bloqueantes.

MAPA REAL (zero API key):
- Use componente OsmMap (iframe OpenStreetMap) — NÃO Mapbox/Google pagos.
- Property com lat/lng opcional para centralizar mapa.

SEO RUNTIME:
- SeoHead em App.tsx: title, description, og via useEffect + JSON-LD script.
- PropertyDetailPage: injete RealEstateListing JSON-LD do imóvel atual.

LGPD:
- CookieConsent no App — localStorage x09_cookie_consent, botões Aceitar/Recusar.

A11Y:
- aria-label em botões ícone; focus-visible:ring; contraste WCAG; skip link "Ir ao conteúdo".
`.trim(),
  homePageRules: `
- Inclua <a href="#main" className="sr-only focus:not-sr-only">Ir ao conteúdo</a>.
- id="main" no <main>.
`.trim(),
  loginPageRules: `
- Após signUp/signIn, se user_metadata.role existir, chame onNavigateBroker/onNavigateOwner/onNavigateAdmin.
- Toggle persona (Corretor/Proprietário/Admin) antes do cadastro — passe role no options.data do signUp.
`.trim(),
  dashboardPageRules: "",
  editRules: `
- Preserve CookieConsent, SeoHead, OsmMap e JSON-LD ao editar.
- Não remova fm=webp das URLs Unsplash.
`.trim(),
};
