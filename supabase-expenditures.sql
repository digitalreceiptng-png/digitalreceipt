-- Financial-summary expenditures/taxes, stored server-side so they sync
-- across web, desktop, and mobile.
create table if not exists user_expenditures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'Expenditure',
  value numeric not null default 0,
  type text not null default 'fixed' check (type in ('fixed', 'percent')),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_user_expenditures_user
  on user_expenditures (user_id);
