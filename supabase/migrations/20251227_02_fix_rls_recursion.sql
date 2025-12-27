-- Migration: Fix RLS recursion issues and add missing tables
-- Date: 2025-12-27
-- Fixes infinite recursion in customers policies and adds subscription_cancellations

BEGIN;

-- ============================================
-- 1. FIX RECURSION IN CUSTOMERS POLICIES
-- ============================================

-- Drop problematic policies
DROP POLICY IF EXISTS customers_admin_all ON public.customers;

-- Recreate with better logic to avoid recursion
CREATE POLICY "customers_admin_all"
ON public.customers
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
);

-- ============================================
-- 2. ADD MISSING TABLES AND POLICIES
-- ============================================

-- Subscription cancellations table (if not exists with correct structure)
CREATE TABLE IF NOT EXISTS public.subscription_cancellations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  provider TEXT,
  service_type TEXT,
  custom_service_name TEXT,
  notice_period TEXT,
  last_due_date DATE,
  provider_contact TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'waiting_customer', 'waiting_provider', 'cancelled', 'completed')),
  documents TEXT[],
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cancellation comments table (if not exists with correct structure)
CREATE TABLE IF NOT EXISTS public.cancellation_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cancellation_id UUID REFERENCES subscription_cancellations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.subscription_cancellations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cancellation_comments ENABLE ROW LEVEL SECURITY;

-- Policies for subscription_cancellations
CREATE POLICY "subscription_cancellations_own"
ON public.subscription_cancellations
FOR ALL
USING (auth.uid() = customer_id);

CREATE POLICY "subscription_cancellations_admin_all"
ON public.subscription_cancellations
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
);

-- Policies for cancellation_comments
CREATE POLICY "cancellation_comments_own"
ON public.cancellation_comments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM subscription_cancellations sc
    WHERE sc.id = cancellation_comments.cancellation_id
    AND sc.customer_id = auth.uid()
  )
);

CREATE POLICY "cancellation_comments_insert_own"
ON public.cancellation_comments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM subscription_cancellations sc
    WHERE sc.id = cancellation_comments.cancellation_id
    AND sc.customer_id = auth.uid()
  )
);

CREATE POLICY "cancellation_comments_admin_all"
ON public.cancellation_comments
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
);

-- ============================================
-- 3. UPDATE ADMIN FUNCTIONS TO AVOID RLS ISSUES
-- ============================================

-- Update archive_customer to use direct role check
CREATE OR REPLACE FUNCTION public.archive_customer(
  p_customer_id uuid,
  p_reason text DEFAULT 'Administrative archive',
  p_admin_id uuid DEFAULT auth.uid()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  customer_record record;
BEGIN
  -- Check if admin (direct check to avoid RLS recursion)
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_admin_id AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can archive customers';
  END IF;

  -- Get customer data (this should work since we're SECURITY DEFINER)
  SELECT * INTO customer_record
  FROM public.customers
  WHERE id = p_customer_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;

  -- Insert into archived_customers
  INSERT INTO public.archived_customers (
    id, email, name, phone, address, is_admin,
    archived_by, archived_reason, original_created_at, original_data
  ) VALUES (
    customer_record.id,
    customer_record.email,
    customer_record.name,
    customer_record.phone,
    customer_record.address,
    customer_record.is_admin,
    p_admin_id,
    p_reason,
    customer_record.created_at,
    to_jsonb(customer_record)
  );

  -- Delete from customers
  DELETE FROM public.customers WHERE id = p_customer_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Customer archived successfully',
    'archived_id', p_customer_id
  );
END;
$$;

-- Update unarchive_customer similarly
CREATE OR REPLACE FUNCTION public.unarchive_customer(
  p_customer_id uuid,
  p_admin_id uuid DEFAULT auth.uid()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  archived_record record;
BEGIN
  -- Check if admin (direct check to avoid RLS recursion)
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_admin_id AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can unarchive customers';
  END IF;

  -- Get archived customer data
  SELECT * INTO archived_record
  FROM public.archived_customers
  WHERE id = p_customer_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Archived customer not found';
  END IF;

  -- Insert back into customers
  INSERT INTO public.customers (
    id, email, name, phone, address, is_admin, created_at
  ) VALUES (
    archived_record.id,
    archived_record.email,
    archived_record.name,
    archived_record.phone,
    archived_record.address,
    archived_record.is_admin,
    archived_record.original_created_at
  );

  -- Delete from archived_customers
  DELETE FROM public.archived_customers WHERE id = p_customer_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Customer unarchived successfully',
    'customer_id', p_customer_id
  );
END;
$$;

-- Update cleanup_old_data similarly
CREATE OR REPLACE FUNCTION public.cleanup_old_data(
  p_retention_years integer DEFAULT 7,
  p_admin_id uuid DEFAULT auth.uid()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cutoff_date timestamptz;
  deleted_count integer := 0;
BEGIN
  -- Check if admin (direct check to avoid RLS recursion)
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_admin_id AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can cleanup data';
  END IF;

  cutoff_date := now() - interval '1 year' * p_retention_years;

  -- Archive old cases (move to archived status or delete)
  UPDATE public.cases
  SET status = 'archived'
  WHERE created_at < cutoff_date AND status != 'archived';

  -- Log the cleanup
  INSERT INTO public.deleted_users_log (
    user_id, user_email, deleted_by, deletion_reason
  ) VALUES (
    p_admin_id, 'system@trygghand.se', p_admin_id,
    format('Data cleanup: archived cases older than %s years', p_retention_years)
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', format('Cleanup completed. Cases older than %s years archived.', p_retention_years),
    'cutoff_date', cutoff_date
  );
END;
$$;

-- ============================================
-- 4. ADD INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_subscription_cancellations_customer_id ON public.subscription_cancellations(customer_id);
CREATE INDEX IF NOT EXISTS idx_cancellation_comments_cancellation_id ON public.cancellation_comments(cancellation_id);
CREATE INDEX IF NOT EXISTS idx_cancellation_comments_user_id ON public.cancellation_comments(user_id);

COMMIT;