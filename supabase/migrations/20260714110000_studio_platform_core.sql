-- X09 Studio platform core (projeto Supabase exclusivo)
-- Sprint 1

create extension if not exists "pgcrypto";

-- Perfil 1:1 com auth.users
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Workspace pessoal (MVP: 1 por usuário)
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create index if not exists workspaces_owner_id_idx on public.workspaces (owner_id);

alter table public.workspaces enable row level security;

create policy "workspaces_select_own"
  on public.workspaces for select
  using (auth.uid() = owner_id);

create policy "workspaces_insert_own"
  on public.workspaces for insert
  with check (auth.uid() = owner_id);

create policy "workspaces_update_own"
  on public.workspaces for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- Projetos do Studio
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  slug text not null,
  status text not null default 'draft'
    check (status in ('draft', 'generating', 'ready', 'error', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_workspace_slug_unique unique (workspace_id, slug)
);

create index if not exists projects_workspace_id_idx on public.projects (workspace_id);
create index if not exists projects_slug_idx on public.projects (slug);

alter table public.projects enable row level security;

create policy "projects_select_own"
  on public.projects for select
  using (
    exists (
      select 1 from public.workspaces w
      where w.id = workspace_id and w.owner_id = auth.uid()
    )
  );

create policy "projects_insert_own"
  on public.projects for insert
  with check (
    exists (
      select 1 from public.workspaces w
      where w.id = workspace_id and w.owner_id = auth.uid()
    )
  );

create policy "projects_update_own"
  on public.projects for update
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

create policy "projects_delete_own"
  on public.projects for delete
  using (
    exists (
      select 1 from public.workspaces w
      where w.id = workspace_id and w.owner_id = auth.uid()
    )
  );

-- Auto profile + workspace no signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  );

  insert into public.workspaces (owner_id, name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', 'Meu workspace')
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.set_projects_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_projects_updated_at();
