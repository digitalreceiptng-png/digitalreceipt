-- Scope receipt groups to a company profile (sub-account).
-- Run this in the Supabase SQL editor BEFORE deploying the matching code.
--
-- sub_account_id = NULL  -> group belongs to the primary/main profile
-- sub_account_id = <id>  -> group belongs to that company sub-account
--
-- Existing groups keep NULL (main profile), which matches how they behaved before.

alter table receipt_groups
  add column if not exists sub_account_id uuid
  references user_sub_accounts(id) on delete cascade;

create index if not exists idx_receipt_groups_sub_account
  on receipt_groups (sub_account_id);
