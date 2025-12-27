-- 1. Extension för UUID
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Tabell: customers
CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  phone text,
  is_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- 3. Tabell: archived_customers
CREATE TABLE IF NOT EXISTS public.archived_customers (
  id uuid PRIMARY KEY,
  email text,
  name text,
  phone text,
  is_admin boolean DEFAULT false,
  archived_by uuid,
  archived_reason text,
  original_created_at timestamptz,
  original_data jsonb,
  archived_at timestamptz DEFAULT now()
);

ALTER TABLE public.archived_customers ENABLE ROW LEVEL SECURITY;

-- 4. Tabell: deleted_users_log
CREATE TABLE IF NOT EXISTS public.deleted_users_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  deleted_at timestamptz NOT NULL DEFAULT now(),
  reason text
);

ALTER TABLE public.deleted_users_log ENABLE ROW LEVEL SECURITY;

-- 5. Tabell: user_roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id uuid NOT NULL,
  role text NOT NULL,
  PRIMARY KEY (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 6. Funktion: Kontrollera admin-status
CREATE OR REPLACE FUNCTION public.is_admin(p_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = p_user AND role = 'admin'
  );
$$;

-- 7. Revokera execute-rättigheter för funktioner från onödiga roller
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'public') THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM public';
  END IF;
END
$$ LANGUAGE plpgsql;

-- 8. Index för policies
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_deleted_users_log_user_id ON public.deleted_users_log(user_id);

-- 9. RLS Policies

-- customers: Endast admin får SELECT/DELETE/UPDATE/INSERT
DROP POLICY IF EXISTS customers_admin_all ON public.customers;
CREATE POLICY customers_admin_all
  ON public.customers
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- archived_customers: Endast admin får SELECT/INSERT
DROP POLICY IF EXISTS archived_customers_admin_all ON public.archived_customers;
CREATE POLICY archived_customers_admin_all
  ON public.archived_customers
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- deleted_users_log: Endast admin får SELECT/INSERT
DROP POLICY IF EXISTS deleted_users_log_admin_all ON public.deleted_users_log;
CREATE POLICY deleted_users_log_admin_all
  ON public.deleted_users_log
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- user_roles: Endast admin får SELECT/INSERT/DELETE/UPDATE
DROP POLICY IF EXISTS user_roles_admin_all ON public.user_roles;
CREATE POLICY user_roles_admin_all
  ON public.user_roles
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 10. GDPR: Logga radering av kund
-- (Applikationen ska alltid skapa en post i deleted_users_log vid radering)

-- 11. Extra: Endast admin får se persondata
-- (Policies ovan säkerställer detta)

-- 12. Säkerställ att ingen annan än admin kan läsa/skriva persondata
-- (Policies ovan säkerställer detta)

-- 13. (Valfritt) Ta bort gamla policies om de finns
-- ...se DROP POLICY ovan...

-- 14. Tabell: cases (lägg till om den inte finns)
CREATE TABLE IF NOT EXISTS public.cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
  -- ...lägg till övriga fält efter behov...
);

ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;

-- 15. RLS-policy för cases: Endast admin får ALL
DROP POLICY IF EXISTS cases_admin_all ON public.cases;
CREATE POLICY cases_admin_all
  ON public.cases
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- KLART: GDPR-säkra rättigheter och policies för Supabase!
