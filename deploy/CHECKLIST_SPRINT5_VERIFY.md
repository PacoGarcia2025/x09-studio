# Checklist Sprint 5 — Verify Engine

## Pré-requisitos

- [ ] Migration `20260714400000_studio_verify_reports.sql` aplicada no Supabase do Studio
- [ ] `STUDIO_PROJECTS_ROOT` apontando para projetos gerados
- [ ] `GEMINI_API_KEY` (opcional: relatório funciona sem IA; sugestões ficam só das tools)

## Fluxo E2E

- [ ] Criar / abrir projeto
- [ ] Gerar plano (Planner)
- [ ] Executar Builder até `plans.status = built`
- [ ] Verify inicia automaticamente após Builder OK
- [ ] UI mostra as 7 categorias: Build, Lint, TypeScript, Dependências, Banco, Env, Estrutura
- [ ] Cada categoria transita: Pending → Running → Success | Warning | Failed
- [ ] Relatório lista issues com severidade, arquivo, sugestão e confiança
- [ ] Linha em `verify_reports` persistida (`report_json` version 1)
- [ ] Botão **Executar Verify** permite re-rodar sem novo Builder
- [ ] Disco: código-fonte do projeto **não** foi editado pelo Verify (só `node_modules` / `dist` de checks)

## Preparação Fix (Sprint 6)

- [ ] `getFixInputAction(projectId)` retorna issues com `fixTarget`
- [ ] `src/lib/pipeline/fix-contract.ts` documenta o consumo do report
- [ ] Issues acionáveis filtráveis por `selectActionableIssues`

## Fora de escopo (confirmado)

- [ ] Auto Fix — Sprint 6
- [ ] Preview / Docker Preview / Deploy — sprints seguintes

## Comandos de plataforma

```bash
npm run typecheck
npm run lint
npm run build
```

Smoke local (sem UI):

```bash
npx tsx scripts/smoke-verify.ts <projectUuid>
```
