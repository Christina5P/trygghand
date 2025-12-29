-- Complete database setup script for Trygg Hand
-- Run this directly in Supabase SQL Editor or via psql
-- This script sets up all necessary tables, policies, and fixes for the contact-to-customer conversion

BEGIN;

-- ============================================
-- 1. CREATE MISSING TABLES
-- ============================================

-- Subscriptions table (needed by other migrations)
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  provider text,
  category text,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- 2. MODIFY EXISTING TABLES
-- ============================================

-- Make email nullable in customers table
ALTER TABLE public.customers
DROP CONSTRAINT IF EXISTS customers_email_key;

ALTER TABLE public.customers
DROP CONSTRAINT IF EXISTS customers_id_fkey;

ALTER TABLE public.customers
ALTER COLUMN email DROP NOT NULL;

-- Add customer_id to contact_requests
ALTER TABLE public.contact_requests
ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL;

-- ============================================
-- 3. ENABLE RLS AND ADD POLICIES
-- ============================================

-- Enable RLS on subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for subscriptions
DROP POLICY IF EXISTS "subscriptions_admin_all" ON public.subscriptions;
CREATE POLICY "subscriptions_admin_all" ON public.subscriptions
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================
-- 4. FIX CONTACT REQUESTS POLICIES
-- ============================================

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Admins can manage contact requests" ON contact_requests;
DROP POLICY IF EXISTS "contact_requests_insert_anyone" ON public.contact_requests;
DROP POLICY IF EXISTS "contact_requests_select_admin" ON public.contact_requests;
DROP POLICY IF EXISTS "contact_requests_update_admin" ON public.contact_requests;
DROP POLICY IF EXISTS "contact_requests_delete_admin" ON public.contact_requests;

-- Add correct policies
CREATE POLICY "contact_requests_insert_anon" ON public.contact_requests
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "contact_requests_admin_select" ON public.contact_requests
  FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "contact_requests_admin_update" ON public.contact_requests
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "contact_requests_admin_delete" ON public.contact_requests
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- ============================================
-- 5. ADD GDPR CONSENT FIELDS
-- ============================================

ALTER TABLE public.contact_requests
ADD COLUMN IF NOT EXISTS gdpr_consent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS consent_timestamp timestamptz DEFAULT now();

COMMIT;

-- Verification queries (run these after the script)
-- SELECT 'customers email nullable check' as test, attnotnull as is_nullable FROM pg_attribute WHERE attrelid = 'public.customers'::regclass AND attname = 'email';
-- SELECT 'contact_requests has customer_id' as test, COUNT(*) > 0 as has_column FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'contact_requests' AND column_name = 'customer_id';