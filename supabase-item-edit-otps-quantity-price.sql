-- Extends the item-edit OTP flow to also cover quantity and unit price
-- (e.g. "Month(s)" and "Monthly Fee" on a service-charge receipt), not just
-- the description. new_description becomes optional since an edit may only
-- touch quantity/unit_price.
alter table receipt_item_edit_otps
  alter column new_description drop not null,
  add column if not exists new_quantity numeric,
  add column if not exists new_unit_price numeric;
