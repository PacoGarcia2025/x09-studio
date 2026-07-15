# Checklist Sprint 6 — Auto Fix Engine

## Pré-requisitos

- [ ] Migration `20260714500000_studio_fix_runs.sql` aplicada
- [ ] Sprint 5 (Verify) operacional
- [ ] `GEMINI_API_KEY` (necessária para patches `edit_file` / `create_file` / `sql_migration`)

## Fluxo E2E

- [ ] Builder → Verify automático
- [ ] Auto Fix inicia após Verify
- [ ] UI pública mostra apenas: **✨ Corrigindo automaticamente...**
- [ ] Ao concluir: ✔ verificado · ✔ corrigido · ✔ Health Score
- [ ] Painel avançado: tentativas, tempo, arquivos, % sucesso, histórico
- [ ] Loop Fix → Verify até 0 erros ou `max_attempts` (default 3)
- [ ] Fix **não** descobre erros por conta própria (só issues do report)
- [ ] `projects.preview_ready = true` quando elegível
- [ ] `checkPreviewReadyAction` / `assertProjectPreviewReady` bloqueiam projetos não aprovados

## Preview (Sprint 7) — contrato pronto

- [ ] Usar `src/lib/pipeline/preview-gate.ts`
- [ ] Abrir preview **somente** se `preview_ready` e health ≥ 80

## Fora de escopo

- [ ] Preview / Docker / Deploy — Sprint 7+

## Comandos plataforma

```bash
npm run typecheck
npm run lint
npm run build
```
