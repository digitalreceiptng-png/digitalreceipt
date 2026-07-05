-- ============================================================
-- RLS Fix — Run this in Supabase Dashboard → SQL Editor
-- Enables RLS on every table and adds a deny-all fallback
-- policy to any table that currently has zero policies.
-- Tables accessed only via service role (shield, admin) are
-- safe: RLS enabled + no policy = anon key blocked entirely.
-- ============================================================

-- ── Step 1: Enable RLS on ALL real tables ──────────────────
ALTER TABLE IF EXISTS public.profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.wallets               ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.wallet_transactions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.receipts              ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.receipt_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.receipt_forms         ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.receipt_form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.receipt_form_purposes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.receipt_groups        ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.installment_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payment_reminders     ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_sub_accounts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.staff_members         ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.staff_invites         ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.otp_sessions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.identity_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_activities       ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.support_tickets       ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.announcements         ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.partners              ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.blog_posts            ENABLE ROW LEVEL SECURITY;
-- Admin / internal tables — service role only (no anon access needed)
ALTER TABLE IF EXISTS public.admins                ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admin_otps            ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.audit_log             ENABLE ROW LEVEL SECURITY;
-- Security shield tables — written/read only via service role
ALTER TABLE IF EXISTS public.security_events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.blocked_ips           ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.threat_scores         ENABLE ROW LEVEL SECURITY;

-- ── Step 2: Add deny-all fallback on service-role-only tables
-- (RLS on + no policy = anon key already blocked, but being
--  explicit makes Supabase's advisor happy and is clearer)
DO $$ BEGIN

  -- security_events
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='security_events' AND schemaname='public') THEN
    EXECUTE 'CREATE POLICY "no_direct_access" ON public.security_events AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false)';
  END IF;

  -- blocked_ips
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='blocked_ips' AND schemaname='public') THEN
    EXECUTE 'CREATE POLICY "no_direct_access" ON public.blocked_ips AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false)';
  END IF;

  -- threat_scores
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='threat_scores' AND schemaname='public') THEN
    EXECUTE 'CREATE POLICY "no_direct_access" ON public.threat_scores AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false)';
  END IF;

  -- admins
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='admins' AND schemaname='public') THEN
    EXECUTE 'CREATE POLICY "no_direct_access" ON public.admins AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false)';
  END IF;

  -- admin_otps
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='admin_otps' AND schemaname='public') THEN
    EXECUTE 'CREATE POLICY "no_direct_access" ON public.admin_otps AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false)';
  END IF;

  -- audit_log
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='audit_log' AND schemaname='public') THEN
    EXECUTE 'CREATE POLICY "no_direct_access" ON public.audit_log AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false)';
  END IF;

  -- otp_sessions
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='otp_sessions' AND schemaname='public') THEN
    EXECUTE 'CREATE POLICY "no_direct_access" ON public.otp_sessions AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false)';
  END IF;

  -- identity_verifications
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='identity_verifications' AND schemaname='public') THEN
    EXECUTE 'CREATE POLICY "no_direct_access" ON public.identity_verifications AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false)';
  END IF;

END $$;

-- ── Step 3: Verify — run this to see what's still missing ──
SELECT
  t.tablename,
  t.rowsecurity AS rls_enabled,
  COUNT(p.policyname) AS policy_count
FROM pg_tables t
LEFT JOIN pg_policies p ON p.tablename = t.tablename AND p.schemaname = t.schemaname
WHERE t.schemaname = 'public'
GROUP BY t.tablename, t.rowsecurity
ORDER BY t.rowsecurity ASC, t.tablename;
