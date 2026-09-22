-- ============================================================
-- RLS Policy Fix for staff_members
-- Run this in Supabase Dashboard -> SQL Editor
-- ============================================================

-- 1. Enable RLS on staff_members table
ALTER TABLE IF EXISTS public.staff_members ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if any to prevent conflicts
DROP POLICY IF EXISTS "Owners can insert staff members" ON public.staff_members;
DROP POLICY IF EXISTS "Owners can view staff members" ON public.staff_members;
DROP POLICY IF EXISTS "Owners can update staff members" ON public.staff_members;
DROP POLICY IF EXISTS "Owners can delete staff members" ON public.staff_members;

-- 3. Create RLS policies for account owners
CREATE POLICY "Owners can insert staff members"
ON public.staff_members FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can view staff members"
ON public.staff_members FOR SELECT
TO authenticated
USING (auth.uid() = owner_id);

CREATE POLICY "Owners can update staff members"
ON public.staff_members FOR UPDATE
TO authenticated
USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete staff members"
ON public.staff_members FOR DELETE
TO authenticated
USING (auth.uid() = owner_id);
