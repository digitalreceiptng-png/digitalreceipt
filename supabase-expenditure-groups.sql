-- Scope expenditures/taxes to a receipt group.
-- group_id NULL  = "General" (applies to the overall summary / no group selected)
-- group_id <uuid> = applies only to that group's summary + export.
alter table user_expenditures add column if not exists group_id uuid;

create index if not exists idx_user_expenditures_group on user_expenditures (user_id, group_id);
