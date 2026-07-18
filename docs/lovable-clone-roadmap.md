# Studio X09 — roadmap do produto visual

## Decisões canônicas

- **Produto principal:** `apps/studio-visual-mvp`.
- **Backend/BFF:** Next.js 15 na raiz do monorepo.
- **Projeto principal no banco:** `visual_projects`.
- **Billing:** Mercado Pago Checkout Pro com pacotes de créditos.
- **Design:** violeta premium (`#7C3AED`) com fúcsia como apoio.
- **Preview:** Sandpack; WebContainer somente quando houver necessidade real.
- **Deploy:** Vercel API.
- **Versionamento externo:** GitHub App.
- **IA:** router por tarefa. Gemini para fluxos rápidos; Claude via OpenRouter
  para edição/premium/repair. Novos providers entram após avaliação, não por
  troca cega do principal.

O Next `/projects` e seu pipeline em filesystem permanecem como plataforma
legada/técnica. Funcionalidades úteis podem ser migradas ao Visual MVP, mas as
duas interfaces não devem competir como produto final.

## Marco 1 — Fundação visual (implementado)

- Paleta e tokens migrados para violeta premium.
- Sidebar: Início, Criar App, Meus Apps, Agentes, Ecossistema, Configurações.
- Home com hero, prompt principal, templates iniciais e projetos recentes.
- Página de Agentes com estado do pipeline.
- Workspace com preview Desktop, Tablet e Mobile.
- Histórico montado na interface com restauração e desfazer.
- Billing Mercado Pago mantido e adaptado à identidade violeta.
- Conectores, projetos e deploy adaptados à mesma identidade.

## Marco 2 — Memória e histórico (base implementada)

- Nova tabela `visual_project_versions` com RLS.
- Até 20 snapshots recentes são persistidos por projeto.
- Ao reabrir um projeto, histórico, `app_spec` e métricas são hidratados.
- O save principal continua funcionando caso a migration ainda não tenha sido
  aplicada; o histórico remoto só ativa após aplicar a migration.

## Marco 3 — Produção e integrações

1. Aplicar migrations Supabase, incluindo
   `20260718190500_visual_project_versions.sql`.
2. Confirmar webhook Mercado Pago:
   `https://studio.x09.com.br/api/webhooks/mercadopago`.
3. Configurar GitHub App na VPS.
4. Configurar Vercel token e webhook na VPS.
5. Separar Nginx entre frontend Visual MVP e `/api` do Next, se continuarem em
   processos/portas distintos.

## Marco 4 — Paridade avançada

- Visual Edits por seleção de elemento no preview.
- Diff antes de aplicar edição natural.
- Branches/versões nomeadas e comparação visual.
- Templates persistidos e administráveis.
- GitHub sync bidirecional (hoje o fluxo principal é push).
- Upload real de imagens/assets via Supabase Storage.
- Memória longa resumida por projeto.
- Verifier do pipeline clássico adaptado ao fluxo visual.

## Marco 5 — Escala e qualidade

- Rate limiting distribuído.
- Refund automático de crédito em falha anterior à entrega.
- Code splitting de Sandpack/Monaco.
- Observabilidade de erros e funil de produto.
- E2E dos fluxos signup → build → checkout → deploy.
- Staging, migrations no pipeline e deploy sem downtime.

## Regra de produto

Uma função só deve aparecer como disponível quando possui handler, backend e
estado de erro. Catálogos conceituais não devem parecer integrações ativas.
