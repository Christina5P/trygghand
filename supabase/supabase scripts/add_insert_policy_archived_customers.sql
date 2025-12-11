-- ========================================
-- RLS POLICY: Allow admin to insert archived customers
-- ========================================
-- Kör detta i Supabase SQL Editor

-- Policy för INSERT (admin kan arkivera kunder)
CREATE POLICY "admin_can_insert_archived_customers"
ON archived_customers
FOR INSERT
WITH CHECK (
    (SELECT is_admin FROM public.customers WHERE id = auth.uid()) = true
);

-- Policy för UPDATE (admin kan uppdatera arkiverade kunder)
CREATE POLICY "admin_can_update_archived_customers"
ON archived_customers
FOR UPDATE
USING (
    (SELECT is_admin FROM public.customers WHERE id = auth.uid()) = true
);

-- Verifiera policies
SELECT schemaname, tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename = 'archived_customers'
ORDER BY policyname;
