-- Pacotes de crédito v2: Start / Plus / Pro / Studio.
-- Sobe o bônus de cadastro para 22 (18 3D comercial + 3 site + 1 folga).
-- Não altera wallets já existentes.

insert into public.billing_plans (code, name, monthly_credits, amount_cents, currency, active)
values
  ('basic', 'Start', 36, 4900, 'BRL', true),
  ('plus', 'Plus', 90, 9900, 'BRL', true),
  ('pro', 'Pro', 180, 18900, 'BRL', true),
  ('studio', 'Studio', 450, 42900, 'BRL', true)
on conflict (code) do update set
  name = excluded.name,
  monthly_credits = excluded.monthly_credits,
  amount_cents = excluded.amount_cents,
  active = excluded.active,
  currency = excluded.currency;

-- Conta nova: 22 créditos = um Texto → 3D comercial (18) + um site (3) + folga.
create or replace function public.ensure_credit_wallet()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.credit_wallets (user_id, balance, lifetime_granted)
  values (new.id, 22, 22)
  on conflict (user_id) do nothing;

  insert into public.credit_ledger (
    user_id, amount, balance_after, reason, idempotency_key, ref_type
  )
  values (
    new.id, 22, 22, 'signup_bonus', 'signup_bonus:' || new.id::text, 'system'
  )
  on conflict (user_id, idempotency_key) do nothing;

  return new;
end;
$$;
