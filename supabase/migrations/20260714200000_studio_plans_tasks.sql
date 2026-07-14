-- Planos gerados pelo Planner (Sprint 2)

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  prompt text not null,
  plan_json jsonb not null,
  model text,
  status text not null default 'ready'
    check (status in ('ready', 'error')),
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists plans_project_id_idx on public.plans (project_id);
create index if not exists plans_created_at_idx on public.plans (created_at desc);

alter table public.plans enable row level security;

create policy "plans_select_own"
  on public.plans for select
  using (
    exists (
      select 1
      from public.projects p
      join public.workspaces w on w.id = p.workspace_id
      where p.id = project_id and w.owner_id = auth.uid()
    )
  );

create policy "plans_insert_own"
  on public.plans for insert
  with check (
    exists (
      select 1
      from public.projects p
      join public.workspaces w on w.id = p.workspace_id
      where p.id = project_id and w.owner_id = auth.uid()
    )
  );

-- Tasks tipadas para o Builder (Sprint 4+) — status queued até o worker
create table if not exists public.plan_tasks (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete cascade,
  task_key text not null,
  type text not null,
  title text not null,
  instruction text not null,
  path text,
  depends_on text[] not null default '{}',
  status text not null default 'queued'
    check (status in ('queued', 'running', 'done', 'failed', 'skipped')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint plan_tasks_plan_key_unique unique (plan_id, task_key)
);

create index if not exists plan_tasks_plan_id_idx on public.plan_tasks (plan_id);

alter table public.plan_tasks enable row level security;

create policy "plan_tasks_select_own"
  on public.plan_tasks for select
  using (
    exists (
      select 1
      from public.plans pl
      join public.projects p on p.id = pl.project_id
      join public.workspaces w on w.id = p.workspace_id
      where pl.id = plan_id and w.owner_id = auth.uid()
    )
  );

create policy "plan_tasks_insert_own"
  on public.plan_tasks for insert
  with check (
    exists (
      select 1
      from public.plans pl
      join public.projects p on p.id = pl.project_id
      join public.workspaces w on w.id = p.workspace_id
      where pl.id = plan_id and w.owner_id = auth.uid()
    )
  );

grant all on table public.plans to anon, authenticated, service_role;
grant all on table public.plan_tasks to anon, authenticated, service_role;
