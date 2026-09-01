-- Biblioteca genérica de assets do Studio + vínculo na fila universal.
-- Não aplicar automaticamente. Sem campos específicos de GLB.

create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  created_by uuid not null references auth.users (id) on delete cascade,
  kind text not null
    check (kind in (
      'mesh', 'image', 'audio', 'video', 'texture', 'material',
      'animation', 'hdri', 'thumbnail', 'other'
    )),
  source text not null default 'upload'
    check (source in ('upload', 'generated', 'imported')),
  status text not null default 'ready'
    check (status in ('ready', 'archived', 'missing')),
  original_name text not null,
  storage_path text not null,
  mime_type text,
  byte_size bigint not null default 0 check (byte_size >= 0),
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists assets_workspace_created_idx
  on public.assets (workspace_id, created_at desc);

create index if not exists assets_workspace_kind_idx
  on public.assets (workspace_id, kind);

create index if not exists assets_project_id_idx
  on public.assets (project_id)
  where project_id is not null;

create or replace function public.set_assets_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists assets_set_updated_at on public.assets;
create trigger assets_set_updated_at
  before update on public.assets
  for each row execute function public.set_assets_updated_at();

alter table public.assets enable row level security;

create policy "assets_select_own"
  on public.assets for select
  using (
    exists (
      select 1 from public.workspaces w
      where w.id = workspace_id and w.owner_id = auth.uid()
    )
  );

create policy "assets_insert_own"
  on public.assets for insert
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.workspaces w
      where w.id = workspace_id and w.owner_id = auth.uid()
    )
    and (
      project_id is null
      or exists (
        select 1
        from public.projects p
        join public.workspaces w on w.id = p.workspace_id
        where p.id = project_id
          and p.workspace_id = workspace_id
          and w.owner_id = auth.uid()
      )
    )
  );

create policy "assets_update_own"
  on public.assets for update
  using (
    exists (
      select 1 from public.workspaces w
      where w.id = workspace_id and w.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.workspaces w
      where w.id = workspace_id and w.owner_id = auth.uid()
    )
  );

create policy "assets_delete_own"
  on public.assets for delete
  using (
    exists (
      select 1 from public.workspaces w
      where w.id = workspace_id and w.owner_id = auth.uid()
    )
  );

grant select, insert, update, delete on table public.assets
  to authenticated, service_role;

-- Fila universal: kinds ampliados + referência ao item da biblioteca.
alter table public.asset_jobs
  drop constraint if exists asset_jobs_kind_check;

alter table public.asset_jobs
  add constraint asset_jobs_kind_check
  check (kind in (
    'mesh', 'image', 'audio', 'video', 'texture', 'material',
    'animation', 'hdri', 'thumbnail', 'other'
  ));

alter table public.asset_jobs
  add column if not exists asset_id uuid references public.assets (id) on delete set null;

create index if not exists asset_jobs_asset_id_idx
  on public.asset_jobs (asset_id)
  where asset_id is not null;
