-- Optional "Status" field on receipts (e.g. Resident/Non-resident, Student/Teacher).
-- Only populated when the issuer ticks the Status checkbox during receipt generation.
alter table receipts
  add column if not exists status_label text,
  add column if not exists status_value text;
