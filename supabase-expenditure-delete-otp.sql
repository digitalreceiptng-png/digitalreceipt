-- Require an emailed verification code before deleting an expenditure/tax
-- entry, or removing its attached proof-of-outflow document.
create table if not exists expenditure_delete_otps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  expenditure_id uuid not null references user_expenditures(id) on delete cascade,
  action text not null check (action in ('delete_entry', 'remove_attachment')),
  code_hash text not null,
  attempts int not null default 0,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_expenditure_delete_otps_lookup
  on expenditure_delete_otps (user_id, expenditure_id, action);
