-- Editing a receipt's "Amount Paid" after generation requires two separate
-- codes — one sent to the company profile's email, one to its phone (SMS) —
-- both entered before the pending edit takes effect. Same pattern as
-- receipt_item_edit_otps.
create table if not exists receipt_amount_edit_otps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  receipt_id uuid not null references receipts(id) on delete cascade,
  new_amount_paid numeric not null,
  email_code_hash text,
  phone_code_hash text,
  attempts int not null default 0,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists receipt_amount_edit_otps_receipt_id_idx on receipt_amount_edit_otps(receipt_id);
