-- Sprint 4: Builder queue — logs + update RLS + plan status building/built

alter table public.plans drop constraint if exists plans_status_check;
alter table public.plans
  add constraint plans_status_check
  check (status in ('ready', 'building', 'built', 'error'));

alter table public.plan_tasks
  add column if not exists error_message text,
  add column if not exists started_at timestamptz,
  add column if not exists finished_at timestamptz;

create policy "plan_tasks_update_own"
  on public.plan_tasks for update
  using (
    exists (
      select 1
      from public.plans pl
      join public.projects p on p.id = pl.project_id
      join public.workspaces w on w.id = p.workspace_id
      where pl.id = plan_id and w.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.plans pl
      join public.projects p on p.id = pl.project_id
      join public.workspaces w on w.id = p.workspace_id
      where pl.id = plan_id and w.owner_id = auth.uid()
    )
  );

create policy "plans_update_own"
  on public.plans for update
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

create table if not exists public.plan_task_logs (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete cascade,
  task_id uuid references public.plan_tasks (id) on delete cascade,
  level text not null default 'info'
    check (level in ('info', 'warn', 'error')),
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists plan_task_logs_plan_id_idx
  on public.plan_task_logs (plan_id, created_at);

alter table public.plan_task_logs enable row level security;

create policy "plan_task_logs_select_own"
  on public.plan_task_logs for select
  using (
    exists (
      select 1
      from public.plans pl
      join public.projects p on p.id = pl.project_id
      join public.workspaces w on w.id = p.workspace_id
      where pl.id = plan_id and w.owner_id = auth.uid()
    )
  );

create policy "plan_task_logs_insert_own"
  on public.plan_task_logs for insert
  with check (
    exists (
      select 1
      from public.plans pl
      join public.projects p on p.id = pl.project_id
      join public.workspaces w on w.id = p.workspace_id
      where pl.id = plan_id and w.owner_id = auth.uid()
    )
  );

create policy "plan_task_logs_delete_own"
  on public.plan_task_logs for delete
  using (
    exists (
      select 1
      from public.plans pl
      join public.projects p on p.id = pl.project_id
      join public.workspaces w on w.id = p.workspace_id
      where pl.id = plan_id and w.owner_id = auth.uid()
    )
  );

grant all on table public.plan_task_logs to anon, authenticated, service_role;
