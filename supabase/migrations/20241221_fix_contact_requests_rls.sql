-- Fix contact_requests RLS policies
-- The issue is that anonymous users need to be able to insert without any special WITH CHECK constraints

-- First, disable RLS temporarily to check the current state
ALTER TABLE public.contact_requests DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "contact_requests_insert_anyone" ON public.contact_requests;
DROP POLICY IF EXISTS "contact_requests_admin_select" ON public.contact_requests;
DROP POLICY IF EXISTS "contact_requests_admin_update" ON public.contact_requests;
DROP POLICY IF EXISTS "contact_requests_admin_delete" ON public.contact_requests;

-- Re-enable RLS
ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;

-- 1. Anyone (anon + auth) may insert - simplified, no additional WITH CHECK
CREATE POLICY "contact_requests_insert_anyone"
ON public.contact_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- 2. Admins may read
CREATE POLICY "contact_requests_select_admin"
ON public.contact_requests
FOR SELECT
TO authenticated
USING (is_admin());

-- 3. Admins may update
CREATE POLICY "contact_requests_update_admin"
ON public.contact_requests
FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- 4. Admins may delete
CREATE POLICY "contact_requests_delete_admin"
ON public.contact_requests
FOR DELETE
TO authenticated
USING (is_admin());
