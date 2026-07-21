-- RLS multi-tenant imobiliária 360° (app gerado — Supabase do cliente)
-- Roles: broker | owner | admin via auth.users.raw_user_meta_data

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.tenant_properties (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  owner_user_id uuid references auth.users (id),
  broker_user_id uuid references auth.users (id),
  title text not null,
  price_brl numeric not null default 0,
  neighborhood text,
  city text,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.tenant_leads (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  broker_user_id uuid references auth.users (id),
  property_id uuid references public.tenant_properties (id) on delete set null,
  client_name text not null,
  status text not null default 'novo',
  created_at timestamptz not null default now()
);

alter table public.organizations enable row level security;
alter table public.tenant_properties enable row level security;
alter table public.tenant_leads enable row level security;

-- Helper: org do usuário logado
create or replace function public.current_user_org_id()
returns uuid
language sql
stable
as $$
  select nullif(auth.jwt() -> 'user_metadata' ->> 'org_id', '')::uuid;
$$;

create or replace function public.current_user_role()
returns text
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'user_metadata' ->> 'role', 'buyer');
$$;

-- Admin vê tudo da org
create policy "org_admin_all_properties"
  on public.tenant_properties for all
  using (
    public.current_user_role() = 'admin'
    and org_id = public.current_user_org_id()
  )
  with check (
    public.current_user_role() = 'admin'
    and org_id = public.current_user_org_id()
  );

-- Broker: CRUD leads e imóveis da org
create policy "broker_leads_org"
  on public.tenant_leads for all
  using (
    public.current_user_role() = 'broker'
    and org_id = public.current_user_org_id()
    and (broker_user_id is null or broker_user_id = auth.uid())
  )
  with check (
    public.current_user_role() = 'broker'
    and org_id = public.current_user_org_id()
  );

create policy "broker_properties_org"
  on public.tenant_properties for select
  using (
    public.current_user_role() = 'broker'
    and org_id = public.current_user_org_id()
  );

create policy "broker_properties_insert"
  on public.tenant_properties for insert
  with check (
    public.current_user_role() = 'broker'
    and org_id = public.current_user_org_id()
    and broker_user_id = auth.uid()
  );

-- Owner: só patrimônio próprio
create policy "owner_properties_own"
  on public.tenant_properties for select
  using (
    public.current_user_role() = 'owner'
    and owner_user_id = auth.uid()
  );

create policy "owner_leads_on_own_property"
  on public.tenant_leads for select
  using (
    public.current_user_role() = 'owner'
    and property_id in (
      select id from public.tenant_properties tp
      where tp.owner_user_id = auth.uid()
    )
  );

-- Visitantes: leitura pública de imóveis ativos (catálogo)
create policy "public_catalog_read"
  on public.tenant_properties for select
  using (status = 'active');

grant select on public.tenant_properties to anon, authenticated;
grant select, insert, update, delete on public.tenant_leads to authenticated;
grant select, insert, update, delete on public.tenant_properties to authenticated;
