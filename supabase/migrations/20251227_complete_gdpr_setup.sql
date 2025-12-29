-- Migration: Complete GDPR-compliant setup for Trygg Hand
-- Date: 2025-12-27
-- This creates all tables, enables RLS, and sets up proper policies

BEGIN;

-- ============================================
-- 1. CREATE ALL TABLES
-- ============================================

-- Customers table
CREATE TABLE IF NOT EXISTS public.customers (
  id uuid REFERENCES auth.users(id) PRIMARY KEY,
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  phone text,
  address text,
  is_admin boolean DEFAULT false,
  is_customer boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Contact requests table
CREATE TABLE IF NOT EXISTS public.contact_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firstname text NOT NULL,
  lastname text,
  email text NOT NULL,
  phone text NOT NULL,
  message text,
  status text DEFAULT 'new',
  converted_to_customer boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Archived customers table
CREATE TABLE IF NOT EXISTS public.archived_customers (
  id uuid PRIMARY KEY,
  email text,
  name text,
  phone text,
  address text,
  is_admin boolean DEFAULT false,
  archived_by uuid,
  archived_reason text,
  original_created_at timestamptz,
  original_data jsonb,
  archived_at timestamptz DEFAULT now()
);

-- Cases table
CREATE TABLE IF NOT EXISTS public.cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  title text,
  description text,
  status text DEFAULT 'open',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Valuations table (skip if it's a view)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_schema = 'public' AND table_name = 'valuations'
  ) THEN
    CREATE TABLE IF NOT EXISTS public.valuations (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
      title text,
      analysis jsonb,
      analysis_result jsonb,
      price_sek integer,
      price_min_sek integer,
      price_max_sek integer,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
  END IF;
END $$;

-- Deleted users log
CREATE TABLE IF NOT EXISTS public.deleted_users_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_email text,
  deleted_by uuid,
  deletion_reason text,
  deleted_at timestamptz DEFAULT now()
);

-- User roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id uuid NOT NULL,
  role text NOT NULL,
  PRIMARY KEY (user_id, role)
);

-- ============================================
-- 2. ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archived_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;

-- Only enable RLS on valuations if it's not a view
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_schema = 'public' AND table_name = 'valuations'
  ) THEN
    EXECUTE 'ALTER TABLE public.valuations ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

ALTER TABLE public.deleted_users_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. CREATE ADMIN CHECK FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION public.is_admin(p_user uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user AND role = 'admin'
  );
$$;

-- Revoke execute from anon/public
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM anon, public;

-- ============================================
-- 4. CREATE GDPR-COMPLIANT POLICIES
-- ============================================

-- CUSTOMERS POLICIES
CREATE POLICY "customers_own_profile"
ON public.customers
FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "customers_update_own"
ON public.customers
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "customers_admin_all"
ON public.customers
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ARCHIVED CUSTOMERS POLICIES
CREATE POLICY "archived_customers_admin_all"
ON public.archived_customers
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- CONTACT REQUESTS POLICIES
CREATE POLICY "contact_requests_insert_anon"
ON public.contact_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "contact_requests_admin_select"
ON public.contact_requests
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "contact_requests_admin_update"
ON public.contact_requests
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "contact_requests_admin_delete"
ON public.contact_requests
FOR DELETE
TO authenticated
USING (public.is_admin());

-- CASES POLICIES
CREATE POLICY "cases_own"
ON public.cases
FOR SELECT
USING (auth.uid() = customer_id);

CREATE POLICY "cases_admin_all"
ON public.cases
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- VALUATIONS POLICIES (only if not a view)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_schema = 'public' AND table_name = 'valuations'
  ) THEN
    EXECUTE 'CREATE POLICY "valuations_own" ON public.valuations FOR SELECT USING (auth.uid() = customer_id)';
    EXECUTE 'CREATE POLICY "valuations_admin_all" ON public.valuations FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())';
  END IF;
END $$;

-- DELETED USERS LOG POLICIES
CREATE POLICY "deleted_users_log_admin_all"
ON public.deleted_users_log
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- USER ROLES POLICIES
CREATE POLICY "user_roles_admin_all"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ============================================
-- 5. ADMIN FUNCTIONS (SECURITY DEFINER)
-- ============================================

-- Function to convert contact request to customer
CREATE OR REPLACE FUNCTION public.convert_contact_to_customer(
  p_contact_id uuid,
  p_admin_id uuid DEFAULT auth.uid()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  contact_record record;
  new_customer_id uuid;
  result jsonb;
BEGIN
  -- Check if admin
  IF NOT public.is_admin(p_admin_id) THEN
    RAISE EXCEPTION 'Only admins can convert contacts to customers';
  END IF;

  -- Get contact details
  SELECT * INTO contact_record
  FROM public.contact_requests
  WHERE id = p_contact_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contact request not found';
  END IF;

  IF contact_record.converted_to_customer THEN
    RAISE EXCEPTION 'Contact already converted to customer';
  END IF;

  -- Check if customer already exists
  SELECT id INTO new_customer_id
  FROM public.customers
  WHERE email = contact_record.email;

  IF FOUND THEN
    -- User exists, just update contact status
    UPDATE public.contact_requests
    SET converted_to_customer = true, updated_at = now()
    WHERE id = p_contact_id;

    result := jsonb_build_object(
      'success', true,
      'message', 'Contact marked as converted (customer already exists)',
      'customer_id', new_customer_id
    );
  ELSE
    -- User doesn't exist yet - backend will need to create auth user first
    result := jsonb_build_object(
      'success', false,
      'message', 'Customer does not exist yet. Create auth user first.',
      'contact_data', jsonb_build_object(
        'firstname', contact_record.firstname,
        'lastname', contact_record.lastname,
        'email', contact_record.email,
        'phone', contact_record.phone
      )
    );
  END IF;

  RETURN result;
END;
$$;

-- Function to archive customer
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
  -- Check if admin
  IF NOT public.is_admin(p_admin_id) THEN
    RAISE EXCEPTION 'Only admins can archive customers';
  END IF;

  -- Get customer data
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

-- Function to unarchive customer
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
  -- Check if admin
  IF NOT public.is_admin(p_admin_id) THEN
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

-- Function to cleanup old data according to accounting laws (7 years retention)
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
  -- Check if admin
  IF NOT public.is_admin(p_admin_id) THEN
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
-- 6. INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email);
CREATE INDEX IF NOT EXISTS idx_contact_requests_email ON public.contact_requests(email);
CREATE INDEX IF NOT EXISTS idx_cases_customer_id ON public.cases(customer_id);

-- Only create index for valuations if it's not a view
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_schema = 'public' AND table_name = 'valuations'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_valuations_customer_id ON public.valuations(customer_id)';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_archived_customers_email ON public.archived_customers(email);

COMMIT;

-- ============================================
-- VERIFICATION QUERIES (run after migration)
-- ============================================
-- SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
-- SELECT * FROM pg_policies WHERE schemaname = 'public';