-- SaaS foundation: billing, GitHub, deployments
-- Visual projects publish fields + credit wallets

-- ─── Billing catalog ───────────────────────────────────────────────
create table if not exists public.billing_plans (
  code text primary key,
  name text not null,
  monthly_credits int not null check (monthly_credits > 0),
  amount_cents int not null check (amount_cents >= 0),
  currency text not null default 'BRL',
  mp_preapproval_plan_id text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.billing_plans (code, name, monthly_credits, amount_cents, currency)
values
  ('basic', 'Básico', 100, 4900, 'BRL'),
  ('pro', 'Pro', 500, 14900, 'BRL')
on conflict (code) do update set
  name = excluded.name,
  monthly_credits = excluded.monthly_credits,
  amount_cents = excluded.amount_cents;

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_code text not null references public.billing_plans (code),
  status text not null check (status in ('pending', 'authorized', 'paused', 'cancelled', 'expired')),
  mp_preapproval_id text unique,
  mp_payer_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_user_id_idx on public.subscriptions (user_id);
create unique index if not exists subscriptions_one_active_per_user
  on public.subscriptions (user_id)
  where status in ('pending', 'authorized', 'paused');

create table if not exists public.credit_wallets (
  user_id uuid primary key references auth.users (id) on delete cascade,
  balance int not null default 0 check (balance >= 0),
  lifetime_granted int not null default 0,
  lifetime_spent int not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  amount int not null,
  balance_after int not null,
  reason text not null check (reason in (
    'subscription_grant', 'generation_debit', 'edit_debit',
    'refund', 'adjustment', 'signup_bonus'
  )),
  idempotency_key text not null,
  ref_type text,
  ref_id text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create index if not exists credit_ledger_user_id_idx on public.credit_ledger (user_id);

create table if not exists public.billing_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'mercadopago',
  event_id text not null,
  topic text not null,
  payload jsonb not null,
  processed_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  unique (provider, event_id)
);

-- ─── GitHub ─────────────────────────────────────────────────────
create table if not exists public.github_installations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  workspace_id uuid references public.workspaces (id) on delete set null,
  installation_id bigint not null unique,
  account_login text not null,
  account_type text not null check (account_type in ('User', 'Organization')),
  account_id bigint,
  suspended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists github_installations_user_id_idx
  on public.github_installations (user_id);

create table if not exists public.github_repositories (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.visual_projects (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  installation_id bigint references public.github_installations (installation_id) on delete set null,
  github_repo_id bigint,
  owner text not null,
  name text not null,
  full_name text not null,
  default_branch text not null default 'main',
  html_url text,
  last_commit_sha text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id)
);

create table if not exists public.github_oauth_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  state_hash text not null unique,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.github_webhook_deliveries (
  delivery_id text primary key,
  event text not null,
  processed_at timestamptz not null default now(),
  payload jsonb
);

-- ─── Deployments ────────────────────────────────────────────────
alter table public.visual_projects
  add column if not exists published_url text,
  add column if not exists publish_status text
    check (publish_status is null or publish_status in (
      'idle', 'queued', 'building', 'ready', 'error', 'canceled'
    )),
  add column if not exists last_deploy_id uuid,
  add column if not exists github_repo_full_name text;

create table if not exists public.project_deployments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.visual_projects (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null default 'vercel',
  vercel_project_id text,
  vercel_deployment_id text,
  status text not null check (status in (
    'queued', 'building', 'ready', 'error', 'canceled'
  )),
  url text,
  inspector_url text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_deployments_project_id_idx
  on public.project_deployments (project_id);
create index if not exists project_deployments_user_id_idx
  on public.project_deployments (user_id);

-- ─── Wallet bootstrap on signup ─────────────────────────────────
create or replace function public.ensure_credit_wallet()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.credit_wallets (user_id, balance, lifetime_granted)
  values (new.id, 20, 20)
  on conflict (user_id) do nothing;

  insert into public.credit_ledger (
    user_id, amount, balance_after, reason, idempotency_key, ref_type
  )
  values (
    new.id, 20, 20, 'signup_bonus', 'signup_bonus:' || new.id::text, 'system'
  )
  on conflict (user_id, idempotency_key) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_credit_wallet on auth.users;
create trigger on_auth_user_credit_wallet
  after insert on auth.users
  for each row execute function public.ensure_credit_wallet();

-- Backfill wallets for existing users
insert into public.credit_wallets (user_id, balance, lifetime_granted)
select id, 20, 20 from auth.users
on conflict (user_id) do nothing;

-- ─── Credit RPCs ────────────────────────────────────────────────
create or replace function public.apply_ledger_entry(
  p_user_id uuid,
  p_amount int,
  p_reason text,
  p_idempotency_key text,
  p_ref_type text default null,
  p_ref_id text default null,
  p_meta jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet public.credit_wallets%rowtype;
  v_existing public.credit_ledger%rowtype;
  v_new_balance int;
begin
  if p_idempotency_key is null or length(trim(p_idempotency_key)) = 0 then
    raise exception 'idempotency_key required';
  end if;

  select * into v_existing
  from public.credit_ledger
  where user_id = p_user_id and idempotency_key = p_idempotency_key;

  if found then
    return jsonb_build_object(
      'ok', true,
      'duplicate', true,
      'balance', v_existing.balance_after,
      'amount', v_existing.amount
    );
  end if;

  insert into public.credit_wallets (user_id, balance)
  values (p_user_id, 0)
  on conflict (user_id) do nothing;

  select * into v_wallet
  from public.credit_wallets
  where user_id = p_user_id
  for update;

  v_new_balance := v_wallet.balance + p_amount;
  if v_new_balance < 0 then
    return jsonb_build_object(
      'ok', false,
      'error', 'insufficient_credits',
      'balance', v_wallet.balance,
      'required', abs(p_amount)
    );
  end if;

  update public.credit_wallets
  set
    balance = v_new_balance,
    lifetime_granted = lifetime_granted + greatest(p_amount, 0),
    lifetime_spent = lifetime_spent + greatest(-p_amount, 0),
    updated_at = now()
  where user_id = p_user_id;

  insert into public.credit_ledger (
    user_id, amount, balance_after, reason, idempotency_key, ref_type, ref_id, meta
  ) values (
    p_user_id, p_amount, v_new_balance, p_reason, p_idempotency_key, p_ref_type, p_ref_id, p_meta
  );

  return jsonb_build_object(
    'ok', true,
    'duplicate', false,
    'balance', v_new_balance,
    'amount', p_amount
  );
end;
$$;

create or replace function public.debit_generation_credits(
  p_user_id uuid,
  p_mode text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cost int;
  v_reason text;
begin
  if p_mode = 'edit' then
    v_cost := 2;
    v_reason := 'edit_debit';
  else
    v_cost := 10;
    v_reason := 'generation_debit';
  end if;

  return public.apply_ledger_entry(
    p_user_id,
    -v_cost,
    v_reason,
    p_idempotency_key,
    'llm_stream',
    p_mode,
    jsonb_build_object('mode', p_mode, 'cost', v_cost)
  );
end;
$$;

create or replace function public.grant_subscription_period(
  p_user_id uuid,
  p_plan_code text,
  p_period_start timestamptz,
  p_period_end timestamptz,
  p_mp_payment_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan public.billing_plans%rowtype;
  v_wallet public.credit_wallets%rowtype;
  v_key text;
  v_existing public.credit_ledger%rowtype;
begin
  select * into v_plan from public.billing_plans where code = p_plan_code and active;
  if not found then
    raise exception 'unknown plan %', p_plan_code;
  end if;

  v_key := 'mp_payment:' || coalesce(p_mp_payment_id, 'none');

  select * into v_existing
  from public.credit_ledger
  where user_id = p_user_id and idempotency_key = v_key;
  if found then
    return jsonb_build_object('ok', true, 'duplicate', true, 'balance', v_existing.balance_after);
  end if;

  insert into public.credit_wallets (user_id, balance)
  values (p_user_id, 0)
  on conflict (user_id) do nothing;

  select * into v_wallet from public.credit_wallets where user_id = p_user_id for update;

  -- Reset mensal para o quota do plano
  update public.credit_wallets
  set
    balance = v_plan.monthly_credits,
    lifetime_granted = lifetime_granted + v_plan.monthly_credits,
    updated_at = now()
  where user_id = p_user_id;

  insert into public.credit_ledger (
    user_id, amount, balance_after, reason, idempotency_key, ref_type, ref_id, meta
  ) values (
    p_user_id,
    v_plan.monthly_credits,
    v_plan.monthly_credits,
    'subscription_grant',
    v_key,
    'mp_payment',
    p_mp_payment_id,
    jsonb_build_object(
      'plan', p_plan_code,
      'period_start', p_period_start,
      'period_end', p_period_end
    )
  );

  update public.subscriptions
  set
    status = 'authorized',
    current_period_start = p_period_start,
    current_period_end = p_period_end,
    updated_at = now()
  where user_id = p_user_id
    and plan_code = p_plan_code
    and status in ('pending', 'authorized', 'paused');

  return jsonb_build_object(
    'ok', true,
    'duplicate', false,
    'balance', v_plan.monthly_credits,
    'plan', p_plan_code
  );
end;
$$;

-- ─── RLS ────────────────────────────────────────────────────────
alter table public.billing_plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.credit_wallets enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.github_installations enable row level security;
alter table public.github_repositories enable row level security;
alter table public.project_deployments enable row level security;

drop policy if exists "billing_plans_read" on public.billing_plans;
create policy "billing_plans_read" on public.billing_plans
  for select using (active = true);

drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own" on public.subscriptions
  for select using (auth.uid() = user_id);

drop policy if exists "credit_wallets_select_own" on public.credit_wallets;
create policy "credit_wallets_select_own" on public.credit_wallets
  for select using (auth.uid() = user_id);

drop policy if exists "credit_ledger_select_own" on public.credit_ledger;
create policy "credit_ledger_select_own" on public.credit_ledger
  for select using (auth.uid() = user_id);

drop policy if exists "github_installations_select_own" on public.github_installations;
create policy "github_installations_select_own" on public.github_installations
  for select using (auth.uid() = user_id);

drop policy if exists "github_repositories_select_own" on public.github_repositories;
create policy "github_repositories_select_own" on public.github_repositories
  for select using (auth.uid() = user_id);

drop policy if exists "project_deployments_select_own" on public.project_deployments;
create policy "project_deployments_select_own" on public.project_deployments
  for select using (auth.uid() = user_id);

-- Support tables: deny client access (service role only)
alter table public.billing_webhook_events enable row level security;
alter table public.github_oauth_states enable row level security;
alter table public.github_webhook_deliveries enable row level security;

-- Grants (select for owners; mutations via service role)
grant select on public.billing_plans to authenticated, anon;
grant select on public.subscriptions to authenticated;
grant select on public.credit_wallets to authenticated;
grant select on public.credit_ledger to authenticated;
grant select on public.github_installations to authenticated;
grant select on public.github_repositories to authenticated;
grant select on public.project_deployments to authenticated;

-- SECURITY DEFINER RPCs: only service_role may execute
revoke all on function public.apply_ledger_entry(uuid, int, text, text, text, text, jsonb) from public;
revoke all on function public.debit_generation_credits(uuid, text, text) from public;
revoke all on function public.grant_subscription_period(uuid, text, timestamptz, timestamptz, text) from public;

grant execute on function public.apply_ledger_entry(uuid, int, text, text, text, text, jsonb) to service_role;
grant execute on function public.debit_generation_credits(uuid, text, text) to service_role;
grant execute on function public.grant_subscription_period(uuid, text, timestamptz, timestamptz, text) to service_role;
