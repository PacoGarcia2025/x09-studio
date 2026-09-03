-- Débito variável: pergunta 1, edição 2, site 3 (passado em p_credits).
-- Substitui o hardcode de -1 em debit_generation_credits.
-- Bônus de cadastro: 23 = 18 (3D comercial) + 3 (site) + 2 (uma edição).
-- Não altera wallets já existentes.

drop function if exists public.debit_generation_credits(uuid, text, text);

create or replace function public.debit_generation_credits(
  p_user_id uuid,
  p_mode text,
  p_idempotency_key text,
  p_credits int default 1
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
  v_reason text;
  v_credits int;
begin
  v_credits := coalesce(p_credits, 1);
  if v_credits < 1 or v_credits > 50 then
    raise exception 'invalid credits';
  end if;

  v_reason := case
    when p_mode in ('edit', 'ask') then 'edit_debit'
    else 'generation_debit'
  end;

  v_result := public.apply_ledger_entry(
    p_user_id,
    -v_credits,
    v_reason,
    p_idempotency_key,
    'llm_stream',
    p_mode,
    jsonb_build_object('mode', p_mode, 'cost', v_credits)
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
      v_credits,
      p_mode,
      jsonb_build_object('source', 'studio', 'mode', p_mode)
    )
    on conflict (user_id, client_request_id) do nothing;
  end if;

  return v_result;
end;
$$;

revoke all on function public.debit_generation_credits(uuid, text, text, int) from public;
grant execute on function public.debit_generation_credits(uuid, text, text, int) to service_role;

create or replace function public.ensure_credit_wallet()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.credit_wallets (user_id, balance, lifetime_granted)
  values (new.id, 23, 23)
  on conflict (user_id) do nothing;

  insert into public.credit_ledger (
    user_id, amount, balance_after, reason, idempotency_key, ref_type
  )
  values (
    new.id, 23, 23, 'signup_bonus', 'signup_bonus:' || new.id::text, 'system'
  )
  on conflict (user_id, idempotency_key) do nothing;

  return new;
end;
$$;

notify pgrst, 'reload schema';
