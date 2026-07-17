-- Compat: projetos do Visual MVP (files JSON + chat_history)
-- Alinha com workspaces da plataforma quando possível.

create table if not exists public.visual_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  workspace_id uuid references public.workspaces (id) on delete set null,
  name text not null,
  files jsonb not null default '{}'::jsonb,
  chat_history jsonb not null default '[]'::jsonb,
  app_spec jsonb,
  metrics jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists visual_projects_user_id_idx
  on public.visual_projects (user_id);

create index if not exists visual_projects_updated_at_idx
  on public.visual_projects (updated_at desc);

alter table public.visual_projects enable row level security;

drop policy if exists "visual_projects_select_own" on public.visual_projects;
create policy "visual_projects_select_own"
  on public.visual_projects for select
  using (auth.uid() = user_id);

drop policy if exists "visual_projects_insert_own" on public.visual_projects;
create policy "visual_projects_insert_own"
  on public.visual_projects for insert
  with check (auth.uid() = user_id);

drop policy if exists "visual_projects_update_own" on public.visual_projects;
create policy "visual_projects_update_own"
  on public.visual_projects for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "visual_projects_delete_own" on public.visual_projects;
create policy "visual_projects_delete_own"
  on public.visual_projects for delete
  using (auth.uid() = user_id);

-- View de compatibilidade: se a tabela `projects` antiga do MVP existir
-- com user_id/files, mantém; senão o client pode apontar para visual_projects.
comment on table public.visual_projects is
  'Projetos do Studio Visual MVP (Sandpack files + chat). Publish aplica migrations separadamente.';
