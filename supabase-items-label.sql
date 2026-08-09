-- Lets the issuer rename the "Items Purchased" section (e.g. to "Services
-- Rendered") so the receipt reads correctly when the line items aren't
-- literally goods. NULL/empty falls back to "Items Purchased" everywhere
-- it's rendered.
alter table receipts
  add column if not exists items_label text;
