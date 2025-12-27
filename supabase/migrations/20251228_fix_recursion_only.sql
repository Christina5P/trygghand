-- Migration: Fix specific RLS recursion issues
-- Date: 2025-12-27
-- Only fixes the recursion problem in customers policies

BEGIN;

-- ============================================
-- 1. FIX RECURSION IN CUSTOMERS POLICIES
-- ============================================

-- Drop problematic policies
DROP POLICY IF EXISTS customers_admin_all ON public.customers;

-- Recreate with direct role check to avoid recursion
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
-- 2. UPDATE ADMIN FUNCTIONS TO USE DIRECT CHECKS
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
BEGIN
  -- Check if admin (direct check to avoid RLS recursion)
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_admin_id AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can cleanup data';
  END IF;

  cutoff_date := now() - interval '1 year' * p_retention_years;

  -- Archive old cases
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

COMMIT;