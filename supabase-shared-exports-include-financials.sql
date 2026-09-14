-- Lets the export column picker also toggle whether the Financial Summary
-- section (Total Revenue / expenditures / Total Balance) appears alongside
-- the receipt list, on the print/view/download output and on shared links.
alter table shared_exports
  add column if not exists include_financials boolean not null default true;
