-- Histórico persistente do Visual MVP.
-- Mantém snapshots separados do projeto principal para permitir undo/redo.

create table if not exists public.visual_project_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.visual_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  prompt text not null default '',
  files jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists visual_project_versions_project_created_idx
  on public.visual_project_versions(project_id, created_at desc);

alter table public.visual_project_versions enable row level security;

drop policy if exists "visual project versions select own"
  on public.visual_project_versions;
create policy "visual project versions select own"
  on public.visual_project_versions
  for select
  using (auth.uid() = user_id);

drop policy if exists "visual project versions insert own"
  on public.visual_project_versions;
create policy "visual project versions insert own"
  on public.visual_project_versions
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.visual_projects project
      where project.id = project_id
        and project.user_id = auth.uid()
    )
  );

drop policy if exists "visual project versions update own"
  on public.visual_project_versions;
create policy "visual project versions update own"
  on public.visual_project_versions
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "visual project versions delete own"
  on public.visual_project_versions;
create policy "visual project versions delete own"
  on public.visual_project_versions
  for delete
  using (auth.uid() = user_id);

grant select, insert, update, delete
  on table public.visual_project_versions
  to authenticated;
