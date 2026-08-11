-- Soft-deleting a receipt keeps the row (so it can be restored) but marks it
-- out of every normal listing, since those already filter on status = 'active'.
-- previous_status lets restore put it back exactly where it was.
alter table receipts add column if not exists deleted_at timestamptz;
alter table receipts add column if not exists previous_status text;

-- Deleting a receipt requires two separate codes — one sent to the company
-- profile's email, one to its phone — both entered before it's removed.
create table if not exists receipt_delete_otps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  receipt_id uuid not null references receipts(id) on delete cascade,
  email_code_hash text,
  phone_code_hash text,
  attempts int not null default 0,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists receipt_delete_otps_receipt_id_idx on receipt_delete_otps(receipt_id);
