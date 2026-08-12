-- Soft-deleting a receipt keeps the row (so it can be restored) but marks it
-- out of every normal listing, since those already filter on status = 'active'.
-- previous_status lets restore put it back exactly where it was.
alter table receipts add column if not exists deleted_at timestamptz;
alter table receipts add column if not exists previous_status text;
-- receipt_number is globally unique, so a soft-deleted row keeps holding its
-- old number forever unless we free it up — this stores the real one so a
-- new receipt (or a restore) can reclaim it.
alter table receipts add column if not exists original_receipt_number text;

-- The existing status check constraint only allowed active/cancelled/expired —
-- widen it to also allow 'deleted', or every soft-delete fails with
-- "violates check constraint receipts_status_check".
alter table receipts drop constraint if exists receipts_status_check;
alter table receipts add constraint receipts_status_check
  check (status in ('active', 'cancelled', 'expired', 'deleted'));

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
