-- Track whether a paid installment has been reflected in the receipt balance,
-- so marking/unmarking can't double-count.
alter table installment_schedules
  add column if not exists applied_to_balance boolean not null default false;

-- One-time reconciliation: apply installments that were already marked paid
-- (under the old behaviour, which never touched the receipt balance).
with paid_sums as (
  select receipt_id, sum(amount) as paid_sum
  from installment_schedules
  where paid_at is not null and applied_to_balance = false
  group by receipt_id
)
update receipts r
set amount_paid = least(r.total_amount, coalesce(r.amount_paid, 0) + ps.paid_sum),
    balance_due = greatest(0, r.total_amount - least(r.total_amount, coalesce(r.amount_paid, 0) + ps.paid_sum))
from paid_sums ps
where r.id = ps.receipt_id;

update installment_schedules
set applied_to_balance = true
where paid_at is not null and applied_to_balance = false;
