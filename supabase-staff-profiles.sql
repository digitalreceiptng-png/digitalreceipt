-- Assign generate-only staff to specific company profiles (or all).
-- manage_all_profiles = true  → staff can access the main account + every current & future sub-account.
-- managed_scopes             → explicit list used when manage_all_profiles is false; each element is
--                              the literal 'main' (main account) and/or a user_sub_accounts.id (as text).
-- Default '{main}' preserves today's behaviour (staff issue against the main account).

alter table staff_members add column if not exists manage_all_profiles boolean not null default false;
alter table staff_members add column if not exists managed_scopes text[] not null default '{main}';

alter table staff_invites add column if not exists manage_all_profiles boolean not null default false;
alter table staff_invites add column if not exists managed_scopes text[] not null default '{main}';
