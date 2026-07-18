-- Credit packs + one-credit Build accounting.
-- Keeps credit_wallets as the canonical balance instead of duplicating it on profiles.

alter table public.credit_wallets
  alter column balance set default 0;

alter table public.credit_ledger
  drop constraint if exists credit_ledger_reason_check;

alter table public.credit_ledger
  add constraint credit_ledger_reason_check check (reason in (
    'subscription_grant', 'credit_purchase', 'generation_debit', 'edit_debit',
    'refund', 'adjustment', 'signup_bonus'
  ));

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

alter table public.usage_logs enable row level security;

drop policy if exists "usage_logs_select_own" on public.usage_logs;
create policy "usage_logs_select_own" on public.usage_logs
  for select using (auth.uid() = user_id);

grant select on public.usage_logs to authenticated;

-- Every newly-created user starts with five free credits.
create or replace function public.ensure_credit_wallet()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.credit_wallets (user_id, balance, lifetime_granted)
  values (new.id, 5, 5)
  on conflict (user_id) do nothing;

  insert into public.credit_ledger (
    user_id, amount, balance_after, reason, idempotency_key, ref_type
  )
  values (
    new.id, 5, 5, 'signup_bonus', 'signup_bonus:' || new.id::text, 'system'
  )
  on conflict (user_id, idempotency_key) do nothing;

  return new;
end;
$$;

-- Backfill only users who still do not have a wallet.
insert into public.credit_wallets (user_id, balance, lifetime_granted)
select id, 5, 5
from auth.users
on conflict (user_id) do nothing;

insert into public.credit_ledger (
  user_id, amount, balance_after, reason, idempotency_key, ref_type
)
select
  users.id,
  5,
  5,
  'signup_bonus',
  'signup_bonus:' || users.id::text,
  'system'
from auth.users users
join public.credit_wallets wallets on wallets.user_id = users.id
where wallets.lifetime_granted = 5
on conflict (user_id, idempotency_key) do nothing;

-- A Build costs exactly one credit. The wallet debit and usage audit happen
-- in the same database transaction and share the same idempotency key.
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

-- Approved Mercado Pago payments add a package to the current balance.
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

revoke all on function public.debit_generation_credits(uuid, text, text) from public;
revoke all on function public.grant_credit_package(uuid, int, text, text) from public;

grant execute on function public.debit_generation_credits(uuid, text, text)
  to service_role;
grant execute on function public.grant_credit_package(uuid, int, text, text)
  to service_role;
