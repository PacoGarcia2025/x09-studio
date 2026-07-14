-- Sprint 5: Verify Engine — relatórios estruturados (somente leitura; Fix consome na Sprint 6)

create table if not exists public.verify_reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  plan_id uuid references public.plans (id) on delete set null,
  status text not null default 'running'
    check (status in ('running', 'passed', 'warning', 'failed', 'error')),
  report_json jsonb not null default '{}'::jsonb,
  summary text,
  model text,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists verify_reports_project_id_idx
  on public.verify_reports (project_id, created_at desc);

create index if not exists verify_reports_plan_id_idx
  on public.verify_reports (plan_id, created_at desc);

create index if not exists verify_reports_status_idx
  on public.verify_reports (status);

alter table public.verify_reports enable row level security;

create policy "verify_reports_select_own"
  on public.verify_reports for select
  using (
    exists (
      select 1
      from public.projects p
      join public.workspaces w on w.id = p.workspace_id
      where p.id = project_id and w.owner_id = auth.uid()
    )
  );

create policy "verify_reports_insert_own"
  on public.verify_reports for insert
  with check (
    exists (
      select 1
      from public.projects p
      join public.workspaces w on w.id = p.workspace_id
      where p.id = project_id and w.owner_id = auth.uid()
    )
  );

create policy "verify_reports_update_own"
  on public.verify_reports for update
  using (
    exists (
      select 1
      from public.projects p
      join public.workspaces w on w.id = p.workspace_id
      where p.id = project_id and w.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.projects p
      join public.workspaces w on w.id = p.workspace_id
      where p.id = project_id and w.owner_id = auth.uid()
    )
  );

create policy "verify_reports_delete_own"
  on public.verify_reports for delete
  using (
    exists (
      select 1
      from public.projects p
      join public.workspaces w on w.id = p.workspace_id
      where p.id = project_id and w.owner_id = auth.uid()
    )
  );

grant all on table public.verify_reports to anon, authenticated, service_role;
