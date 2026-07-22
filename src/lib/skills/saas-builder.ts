import { lacksCinematicQuality } from "@/lib/skills/premium-design";
import { isImobiliaria360 } from "@/lib/skills/detect";
import type { StudioSkill } from "@/lib/skills/types";

export const x09SaasBuilderSkill: StudioSkill = {
  id: "x09-saas-builder",
  name: "SaaS Builder",
  plannerRules: `
- Tipo: SaaS/CRM/painel completo — auth + dashboard + CRUD.
- DashboardPage OBRIGATÓRIA com entidade principal do domínio (imóveis, clientes, contratos, leads…).
- LoginPage com signIn/signUp real; pós-login navega para Dashboard.
- App.tsx: estados home | login | app.
`.trim(),
  builderFileRules: "",
  homePageRules: `
SaaS — landing institucional premium (não só formulário):
- Hero vendendo o produto SaaS com screenshot/mock do dashboard.
- Seção features (bento grid), pricing ou planos se citado, social proof.
- Mesmo padrão cinematográfico da skill landing.
`.trim(),
  loginPageRules: `
- Card premium, toggle Entrar/Criar conta, validação, estados busy/error.
- getSupabase().auth.signInWithPassword / signUp.
- Após sucesso: onNavigateApp?.().
`.trim(),
  dashboardPageRules: `
DASHBOARD PREMIUM (área logada vendável):
- Sidebar ou topbar com logo/nome do produto do brief + navegação + Sair.
- KPI cards no topo (números do domínio).
- Tabela/lista com dados seed realistas do nicho (nomes, status, datas).
- Formulário criar/editar inline ou modal — campos do domínio.
- Estados: loading skeleton, empty state ilustrado, error banner.
- Mínimo ~150 linhas; useState + getSupabase().from quando possível.
- Visual denso Tailwind + motion leve em cards.
`.trim(),
  editRules: `
- Edições SaaS: mantenha CRUD funcional; não remova auth ou rotas.
`.trim(),
  evaluateHome(home, brief) {
    if (isImobiliaria360(brief)) return [];
    return lacksCinematicQuality(home).map((message) => ({
      code: "saas_home_premium",
      message,
      severity: "error" as const,
      penalty: 15,
    }));
  },
};
