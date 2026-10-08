create table if not exists public.apple_iap_transactions (
  transaction_id text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id text not null,
  credit_amount numeric not null check (credit_amount > 0),
  created_at timestamptz not null default now()
);

alter table public.apple_iap_transactions enable row level security;

create or replace function public.credit_wallet_from_apple_purchase(
  p_user_id uuid,
  p_transaction_id text,
  p_product_id text,
  p_credit_amount numeric
)
returns table (credited boolean, balance numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_transaction_id text;
  existing_user_id uuid;
  current_balance numeric;
begin
  insert into public.apple_iap_transactions (transaction_id, user_id, product_id, credit_amount)
  values (p_transaction_id, p_user_id, p_product_id, p_credit_amount)
  on conflict (transaction_id) do nothing
  returning transaction_id into inserted_transaction_id;

  if inserted_transaction_id is null then
    select user_id into existing_user_id
    from public.apple_iap_transactions
    where transaction_id = p_transaction_id;

    if existing_user_id <> p_user_id then
      raise exception 'Apple transaction is already linked to another account';
    end if;

    select wallets.balance into current_balance
    from public.wallets
    where wallets.user_id = p_user_id;

    return query select false, coalesce(current_balance, 0);
    return;
  end if;

  update public.wallets
  set balance = coalesce(wallets.balance, 0) + p_credit_amount
  where wallets.user_id = p_user_id
  returning wallets.balance into current_balance;

  if current_balance is null then
    raise exception 'Wallet not found for purchase';
  end if;

  insert into public.wallet_transactions (user_id, type, amount, description, balance_after)
  values (
    p_user_id,
    'credit',
    p_credit_amount,
    'Apple in-app purchase (' || p_product_id || ')',
    current_balance
  );

  return query select true, current_balance;
end;
$$;

revoke all on function public.credit_wallet_from_apple_purchase(uuid, text, text, numeric) from public, anon, authenticated;
grant execute on function public.credit_wallet_from_apple_purchase(uuid, text, text, numeric) to service_role;