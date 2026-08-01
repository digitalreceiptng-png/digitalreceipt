-- Proof-of-outflow document attached to an expenditure/tax entry.
alter table user_expenditures add column if not exists attachment_url text;
