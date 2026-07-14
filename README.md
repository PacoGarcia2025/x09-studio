# X09 Studio

Gerador de software com IA (`studio.x09.com.br`).

Projeto Supabase **exclusivo** (não compartilhado com o SaaS X09).

## Setup local

1. Crie o projeto Supabase do Studio.
2. Rode as migrations em `supabase/migrations/` (SQL Editor ou CLI).
3. Configure o ambiente:

```bash
cp .env.example .env.local
# preencha NEXT_PUBLIC_SUPABASE_*, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY
```

4. Instale e rode:

```bash
npm install
npm run dev
```

## Sprint 1

- Login / signup (e-mail + senha)
- Criar e listar projetos
- Slug para publish futuro (`*.studio.x09.com.br`)

Deploy VPS: `deploy/CHECKLIST.md` (após Sprint 1 + GitHub).
