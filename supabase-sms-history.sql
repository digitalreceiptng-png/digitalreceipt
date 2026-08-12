-- Tracks every phone number an SMS receipt has been sent to, per receipt, so
-- previously-used numbers (e.g. forwarded to someone other than the buyer)
-- show up as one-click options next time instead of being retyped from memory.
create table if not exists receipt_sms_history (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references receipts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  phone text not null,
  send_count int not null default 1,
  last_sent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (receipt_id, phone)
);

create index if not exists receipt_sms_history_receipt_id_idx on receipt_sms_history(receipt_id);
