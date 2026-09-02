import { lacksPremiumQuality } from "@/lib/skills/premium-design";
import { briefMissingFromContent } from "@/lib/pipeline/brief-context";
import type { StudioSkill } from "@/lib/skills/types";

export const x09LandingPagesSkill: StudioSkill = {
  id: "x09-landing-pages",
  name: "Landing Pages Premium",
  plannerRules: `
- Tipo: landing de alta conversão cinematográfica.
- HomePage: hero full-bleed + prova social + serviços/benefícios + processo + FAQ ou depoimentos + CTA final + footer rico com contatos.
- Inclua WhatsApp/telefone clicáveis (tel:, https://wa.me/) quando no brief.
- LoginPage: porta de entrada para área restrita futura — visual alinhado à marca.
`.trim(),
  builderFileRules: "",
  homePageRules: `
LANDING PREMIUM (conversão + cinema):
- export function HomePage({ onNavigateToLogin?: () => void })
- Header sticky: logo/nome real, 3 âncoras. CTA Entrar SOMENTE se onNavigateToLogin existir (app com painel) — landing simples NÃO tem login.
- Hero: headline emocional + subtítulo + 2 CTAs + fundo imersivo + PNG/recorte transparente. Se o contexto listar /library/, use esses ficheiros no logo e no hero.
- Seção serviços: 3–6 cards com foto da galeria (/library/) ou, só se não houver, foto do tema + ícone lucide, copy específica do negócio.
- Seção prova social: números, logos fictícios do setor OU depoimentos com nomes plausíveis do nicho.
- Seção processo ou diferenciais com layout assimétrico (não grid 3 colunas clone).
- CTA final full-width com gradiente da marca.
- Footer: endereço, telefone, WhatsApp, e-mail, registro profissional/órgão fiscalizador se aplicável, horário se citado.
- Mínimo ~140 linhas de JSX útil; 5+ <section>.
`.trim(),
  loginPageRules: `
- Login alinhado à landing (mesma paleta/marca).
`.trim(),
  dashboardPageRules: "",
  editRules: `
- Edições em landing: preserve seções e motion; altere só o pedido.
- Se mudar cor, aplique em hero, CTAs, orbs e accents — não só um botão.
`.trim(),
  evaluateHome(home, brief) {
    const issues = lacksPremiumQuality(home, brief).map((message) => ({
      code: "landing_premium",
      message,
      severity: "error" as const,
      penalty: 18,
    }));

    if (brief.trim()) {
      for (const msg of briefMissingFromContent(brief, home)) {
        issues.push({
          code: "brief_mismatch",
          message: msg,
          severity: "error",
          penalty: 20,
        });
      }
    }

    if (!/wa\.me|tel:|whatsapp|phone/i.test(home) && /whatsapp|telefone|celular/i.test(brief)) {
      issues.push({
        code: "missing_contact_link",
        message: "Brief cita telefone/WhatsApp mas a landing não tem link clicável",
        severity: "error",
        penalty: 15,
      });
    }

    return issues;
  },
};
