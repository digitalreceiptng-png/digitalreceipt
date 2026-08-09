-- Editing a receipt item's description after generation requires two separate
-- codes — one sent to the company profile's email, one to its phone (SMS) —
-- both entered before the pending edit takes effect.
create table if not exists receipt_item_edit_otps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  item_id uuid not null references receipt_items(id) on delete cascade,
  new_description text not null,
  email_code_hash text,
  phone_code_hash text,
  attempts int not null default 0,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists receipt_item_edit_otps_item_id_idx on receipt_item_edit_otps(item_id);
