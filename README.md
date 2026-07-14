# X09 Studio

Gerador de software com IA (`studio.x09.com.br`).

Projeto Supabase **exclusivo** (não compartilhado com o SaaS X09).

## Setup local

1. Crie o projeto Supabase do Studio.
2. Rode as migrations em `supabase/migrations/` (SQL Editor ou CLI).
3. Configure o ambiente (keys **atuais** do Supabase — publishable + secret):

```bash
cp .env.example .env.local
```

Variáveis usadas pelo app:

| Variável | Valor |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` **ou** `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` |
| `SUPABASE_SERVICE_ROLE_KEY` **ou** `SUPABASE_SECRET_KEY` | `sb_secret_...` (só backend) |
| `GEMINI_API_KEY` | chave Gemini |

Não use as Legacy API Keys (JWT `anon` / `service_role`).

4. Instale e rode:

```bash
npm install
npm run dev
```

## Sprints

- **Sprint 1:** Login / signup, criar e listar projetos
- **Sprint 2:** Planner (prompt → plano JSON + tasks)
- **Sprint 3:** Scaffold + FileSystem (template React/Supabase em disco)
- **Sprint 4:** Builder + Task Queue (tasks → arquivos no disco)

Defina no `.env.local`:

```bash
STUDIO_PROJECTS_ROOT=C:\caminho\absoluto\para\.data\projects
```

Smoke do Planner:

```bash
npx tsx scripts/smoke-planner.ts
```

Deploy VPS: `deploy/CHECKLIST.md`.
