-- A Paystack reference can only ever credit the wallet once. The credit code
-- claims the reference by inserting into wallet_transactions first, so this
-- index is what makes a simultaneous double-credit impossible.
create unique index if not exists wallet_transactions_paystack_reference_uniq
  on wallet_transactions (paystack_reference)
  where paystack_reference is not null;
