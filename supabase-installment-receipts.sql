-- Each paid installment gets its own linked payment receipt (parent_receipt_id
-- points at the main receipt), the same way a manually recorded payment does —
-- so it shows up in the "Payment History" list below the primary receipt.
alter table installment_schedules
  add column if not exists payment_receipt_id uuid references receipts(id) on delete set null;

-- Tracks whether the auto-send-on-due-date cron has already emailed this
-- installment's payment receipt, so it only ever sends once.
alter table installment_schedules
  add column if not exists receipt_sent_at timestamptz;
