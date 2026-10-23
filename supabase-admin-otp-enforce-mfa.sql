-- The admin email-OTP (2FA) step was previously enforced only in the browser's
-- UI — signInWithPassword() already creates a fully valid, admin-authorized
-- Supabase session before the OTP is even sent, and no server-side check ever
-- verified OTP completion. Anyone with just the admin password could skip the
-- OTP step entirely by calling an admin API directly.
--
-- This migration reworks admin_otps from a single global row (keyed by a
-- static 'login' purpose — which also meant two admins logging in at the same
-- time would stomp each other's codes) into a per-user row that also records
-- whether OTP was completed, via a hashed session token checked server-side.
alter table admin_otps
  add column if not exists user_id uuid references admins(id) on delete cascade,
  add column if not exists mfa_token_hash text,
  add column if not exists mfa_verified_at timestamptz;

-- One row per user going forward (the old global 'purpose' column is left in
-- place, unused, for backward compatibility — harmless). Must be a plain
-- (non-partial) unique constraint — Postgres allows multiple NULLs under it
-- regardless, and a partial index can't be used as an ON CONFLICT target by
-- Supabase's upsert({ onConflict: 'user_id' }).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'admin_otps_user_id_key'
  ) then
    alter table admin_otps add constraint admin_otps_user_id_key unique (user_id);
  end if;
end $$;
