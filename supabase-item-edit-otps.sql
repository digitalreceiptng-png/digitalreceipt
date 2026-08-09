-- Editing a receipt item's description after generation requires a code sent
-- to both the company profile's email and phone — this table holds the
-- pending edit + hashed code until confirmed (or it expires).
create table if not exists receipt_item_edit_otps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  item_id uuid not null references receipt_items(id) on delete cascade,
  new_description text not null,
  code_hash text not null,
  attempts int not null default 0,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists receipt_item_edit_otps_item_id_idx on receipt_item_edit_otps(item_id);
