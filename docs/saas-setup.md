# X09 Studio SaaS — setup checklist

## 1. Supabase

1. Aplique as migrations (inclui `20260717220000_saas_billing_github_deploy.sql`).
2. Em Authentication → Providers, ative **GitHub** com Client ID/Secret do OAuth App (scopes mínimos: `read:user`, `user:email`).
3. Redirect URLs:
   - `https://studio.x09.com.br/auth/callback` (Next)
   - `http://localhost:5173/` (Vite MVP)
4. Confirme que `SUPABASE_SECRET_KEY` / service role está só no PM2/Next — nunca no Vite.

## 2. GitHub App

1. Crie uma GitHub App (`GITHUB_APP_SLUG`).
2. Permissions: Contents R/W, Metadata R, Administration R (criar repos).
3. Callback: `https://studio.x09.com.br/api/github/callback`
4. Webhook: `https://studio.x09.com.br/api/github/webhook` + `GITHUB_WEBHOOK_SECRET`
5. Gere private key → `GITHUB_APP_PRIVATE_KEY` (com `\n` escapados no `.env`).

## 3. Mercado Pago

1. Configure `MP_ACCESS_TOKEN` e `MP_WEBHOOK_SECRET` somente no BFF.
2. Ative notificações de pagamentos:
   `https://studio.x09.com.br/api/webhooks/mercadopago`
3. O Checkout Pro usa o catálogo `billing_plans` como pacotes: Básico 100
   créditos e Pro 500 créditos.
4. Um usuário novo recebe 5 créditos; cada Build consome 1; Plan e
   auto-repair não consomem.
5. O webhook busca o pagamento pela SDK, exige `status=approved` e concede
   créditos via RPC idempotente. O consumo é auditado em `usage_logs`.

## 4. Vercel

1. Token com scope de deploy: `VERCEL_TOKEN`
2. Opcional: `VERCEL_TEAM_ID`, `VERCEL_PROJECT_NAME_PREFIX=x09`
3. Webhook: `https://studio.x09.com.br/api/webhooks/vercel` + `VERCEL_WEBHOOK_SECRET`

## 5. Gates de segurança

- IA nunca inicia SSE sem débito aprovado (`402` se saldo insuficiente).
- Webhooks MP/GitHub/Vercel validam assinatura e são idempotentes.
- Push/deploy exigem ownership de `visual_projects`.
- `.env` / secrets nunca vão para GitHub nem Vercel (`secrets-filter`).
- RPCs de crédito só `service_role`.

## 6. Health

`GET /api/health/integrations` — verifica presença de envs sem chamar APIs externas.
