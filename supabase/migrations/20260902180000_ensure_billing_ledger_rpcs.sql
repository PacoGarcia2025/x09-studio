-- Billing only: wallets, ledger, Mercado Pago grants, Build debit.
-- Does NOT touch github_* or visual_projects — those objects blocked the
-- original 20260717220000 file before apply_ledger_entry was created.
-- Safe to re-run. Apply this on the Studio Supabase project, then
-- NOTIFY pgrst so PostgREST reloads the schema cache.

-- ─── Catalog / wallet tables ─────────────────────────────────────
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
  reason text not null,
  idempotency_key text not null,
  ref_type text,
  ref_id text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create index if not exists credit_ledger_user_id_idx on public.credit_ledger (user_id);

alter table public.credit_ledger
  drop constraint if exists credit_ledger_reason_check;

alter table public.credit_ledger
  add constraint credit_ledger_reason_check check (reason in (
    'subscription_grant', 'credit_purchase', 'generation_debit', 'edit_debit',
    'refund', 'adjustment', 'signup_bonus'
  ));

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

create table if not exists public.usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  client_request_id text not null,
  action text not null check (action in ('build')),
  credits_used int not null check (credits_used > 0),
  mode text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, client_request_id)
);

create index if not exists usage_logs_user_created_idx
  on public.usage_logs (user_id, created_at desc);

-- ─── Ledger RPC (named args used by the Next.js service client) ──
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

-- Site Build = 1 crédito (substitui o custo 10/2 da migration antiga).
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
  v_result jsonb;
begin
  v_result := public.apply_ledger_entry(
    p_user_id,
    -1,
    'generation_debit',
    p_idempotency_key,
    'llm_stream',
    p_mode,
    jsonb_build_object('mode', p_mode, 'cost', 1)
  );

  if coalesce((v_result ->> 'ok')::boolean, false)
     and not coalesce((v_result ->> 'duplicate')::boolean, false) then
    insert into public.usage_logs (
      user_id,
      client_request_id,
      action,
      credits_used,
      mode,
      meta
    )
    values (
      p_user_id,
      p_idempotency_key,
      'build',
      1,
      p_mode,
      jsonb_build_object('source', 'llm_stream')
    )
    on conflict (user_id, client_request_id) do nothing;
  end if;

  return v_result;
end;
$$;

create or replace function public.grant_credit_package(
  p_user_id uuid,
  p_credits int,
  p_payment_id text,
  p_package_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_credits <= 0 then
    raise exception 'credits must be positive';
  end if;

  if p_payment_id is null or length(trim(p_payment_id)) = 0 then
    raise exception 'payment_id required';
  end if;

  return public.apply_ledger_entry(
    p_user_id,
    p_credits,
    'credit_purchase',
    'mp_payment:' || p_payment_id,
    'mp_payment',
    p_payment_id,
    jsonb_build_object(
      'package_code', p_package_code,
      'credits', p_credits
    )
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

-- Conta nova: 20 créditos = um Texto → 3D comercial (18) + um site (1) + folga.
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

-- Wallets em falta (não altera quem já tem saldo).
insert into public.credit_wallets (user_id, balance, lifetime_granted)
select id, 20, 20 from auth.users
on conflict (user_id) do nothing;

-- ─── RLS ────────────────────────────────────────────────────────
alter table public.billing_plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.credit_wallets enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.billing_webhook_events enable row level security;
alter table public.usage_logs enable row level security;

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

drop policy if exists "usage_logs_select_own" on public.usage_logs;
create policy "usage_logs_select_own" on public.usage_logs
  for select using (auth.uid() = user_id);

grant select on public.billing_plans to authenticated, anon;
grant select on public.subscriptions to authenticated;
grant select on public.credit_wallets to authenticated;
grant select on public.credit_ledger to authenticated;
grant select on public.usage_logs to authenticated;

revoke all on function public.apply_ledger_entry(uuid, int, text, text, text, text, jsonb) from public;
revoke all on function public.debit_generation_credits(uuid, text, text) from public;
revoke all on function public.grant_credit_package(uuid, int, text, text) from public;
revoke all on function public.grant_subscription_period(uuid, text, timestamptz, timestamptz, text) from public;

grant execute on function public.apply_ledger_entry(uuid, int, text, text, text, text, jsonb) to service_role;
grant execute on function public.debit_generation_credits(uuid, text, text) to service_role;
grant execute on function public.grant_credit_package(uuid, int, text, text) to service_role;
grant execute on function public.grant_subscription_period(uuid, text, timestamptz, timestamptz, text) to service_role;

notify pgrst, 'reload schema';
