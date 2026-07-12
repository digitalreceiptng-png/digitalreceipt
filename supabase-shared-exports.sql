-- Shareable, revocable public links to a receipts export view.
create table if not exists shared_exports (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  user_id uuid not null,
  sub_account_id uuid,
  group_id uuid,
  title text,
  columns jsonb,
  revoked boolean not null default false,
  created_at timestamptz not null default now()
);

-- If the table already exists, make sure the columns picker field is present.
alter table shared_exports add column if not exists columns jsonb;

create index if not exists idx_shared_exports_token on shared_exports (token);
create index if not exists idx_shared_exports_user on shared_exports (user_id);
