-- Sprint 6: Auto Fix Engine + Preview readiness gate

alter table public.projects
  add column if not exists preview_ready boolean not null default false,
  add column if not exists health_score numeric(5, 2),
  add column if not exists last_verify_report_id uuid
    references public.verify_reports (id) on delete set null,
  add column if not exists last_fix_run_id uuid;

create table if not exists public.fix_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  plan_id uuid references public.plans (id) on delete set null,
  status text not null default 'running'
    check (status in (
      'running',
      'succeeded',
      'partial',
      'failed',
      'exhausted'
    )),
  phase text not null default 'fixing'
    check (phase in ('fixing', 'verifying', 'done')),
  max_attempts integer not null default 3
    check (max_attempts >= 1 and max_attempts <= 10),
  attempt_count integer not null default 0,
  health_score numeric(5, 2),
  success_rate numeric(5, 2),
  total_duration_ms integer,
  files_changed text[] not null default '{}',
  fixes_applied integer not null default 0,
  fixes_failed integer not null default 0,
  current_verify_report_id uuid
    references public.verify_reports (id) on delete set null,
  result_json jsonb not null default '{}'::jsonb,
  preview_ready boolean not null default false,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists fix_runs_project_id_idx
  on public.fix_runs (project_id, created_at desc);

create index if not exists fix_runs_plan_id_idx
  on public.fix_runs (plan_id, created_at desc);

create index if not exists fix_runs_status_idx
  on public.fix_runs (status);

alter table public.fix_runs enable row level security;

create policy "fix_runs_select_own"
  on public.fix_runs for select
  using (
    exists (
      select 1
      from public.projects p
      join public.workspaces w on w.id = p.workspace_id
      where p.id = project_id and w.owner_id = auth.uid()
    )
  );

create policy "fix_runs_insert_own"
  on public.fix_runs for insert
  with check (
    exists (
      select 1
      from public.projects p
      join public.workspaces w on w.id = p.workspace_id
      where p.id = project_id and w.owner_id = auth.uid()
    )
  );

create policy "fix_runs_update_own"
  on public.fix_runs for update
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

create policy "fix_runs_delete_own"
  on public.fix_runs for delete
  using (
    exists (
      select 1
      from public.projects p
      join public.workspaces w on w.id = p.workspace_id
      where p.id = project_id and w.owner_id = auth.uid()
    )
  );

-- FK circular: projects.last_fix_run_id → fix_runs
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'projects_last_fix_run_id_fkey'
  ) then
    alter table public.projects
      add constraint projects_last_fix_run_id_fkey
      foreign key (last_fix_run_id)
      references public.fix_runs (id)
      on delete set null;
  end if;
end $$;

grant all on table public.fix_runs to anon, authenticated, service_role;
