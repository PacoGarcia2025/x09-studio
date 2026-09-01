-- AI Engine — fila de geração de assets (mesh, imagem, áudio, etc.)
-- Fase 1: só infraestrutura. Sem worker, sem billing, sem geração.

create table if not exists public.asset_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  created_by uuid not null references auth.users (id) on delete cascade,
  kind text not null
    check (kind in (
      'mesh', 'image', 'audio', 'video', 'texture', 'material', 'animation'
    )),
  provider_id text not null
    check (provider_id in ('local', 'trellis', 'triposr', 'hunyuan', 'future')),
  status text not null default 'queued'
    check (status in (
      'queued', 'running', 'retrying', 'done', 'failed', 'skipped', 'cancelled'
    )),
  input_path text,
  output_path text,
  error_message text,
  meta jsonb not null default '{}'::jsonb,
  -- Preparado para cobrança futura. V1 não debita: permanece 0.
  credits_reserved integer not null default 0
    check (credits_reserved >= 0),
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists asset_jobs_workspace_created_idx
  on public.asset_jobs (workspace_id, created_at desc);

create index if not exists asset_jobs_project_id_idx
  on public.asset_jobs (project_id, created_at desc)
  where project_id is not null;

create index if not exists asset_jobs_status_idx
  on public.asset_jobs (status);

create index if not exists asset_jobs_kind_idx
  on public.asset_jobs (workspace_id, kind);

create or replace function public.set_asset_jobs_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists asset_jobs_set_updated_at on public.asset_jobs;
create trigger asset_jobs_set_updated_at
  before update on public.asset_jobs
  for each row execute function public.set_asset_jobs_updated_at();

alter table public.asset_jobs enable row level security;

create policy "asset_jobs_select_own"
  on public.asset_jobs for select
  using (
    exists (
      select 1 from public.workspaces w
      where w.id = workspace_id and w.owner_id = auth.uid()
    )
  );

create policy "asset_jobs_insert_own"
  on public.asset_jobs for insert
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

create policy "asset_jobs_update_own"
  on public.asset_jobs for update
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

create policy "asset_jobs_delete_own"
  on public.asset_jobs for delete
  using (
    exists (
      select 1 from public.workspaces w
      where w.id = workspace_id and w.owner_id = auth.uid()
    )
  );

grant select, insert, update, delete on table public.asset_jobs
  to authenticated, service_role;
