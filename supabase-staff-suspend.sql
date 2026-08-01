-- Lets an owner temporarily stop a staff member's access (reversible) without
-- going through the full OTP-gated "Remove Staff" flow, which deactivates
-- the row permanently and drops it from the Active Staff list.
alter table staff_members add column if not exists suspended boolean not null default false;
