-- ========================================
-- DEBUG & FIX: Arkivera kunder (RLS problem)
-- ========================================

-- 1. Kolla om du är admin
SELECT id, email, is_admin 
FROM customers 
WHERE id = auth.uid();

-- 2. Om is_admin är NULL eller false, sätt den till true:
UPDATE customers 
SET is_admin = true 
WHERE id = auth.uid();

-- 3. Kolla nuvarande policies på archived_customers
SELECT policyname, cmd, qual::text, with_check::text 
FROM pg_policies 
WHERE tablename = 'archived_customers';

-- 4. TILLFÄLLIG LÖSNING: Stäng av RLS helt för test
ALTER TABLE archived_customers DISABLE ROW LEVEL SECURITY;

-- Testa arkivera nu. Om det fungerar, fortsätt:

-- 5. Slå på RLS igen och lägg till enkel policy
ALTER TABLE archived_customers ENABLE ROW LEVEL SECURITY;

-- Ta bort alla policies
DROP POLICY IF EXISTS "admin_full_access_archived_customers" ON archived_customers;
DROP POLICY IF EXISTS "admin_can_insert_archived_customers" ON archived_customers;
DROP POLICY IF EXISTS "admin_can_update_archived_customers" ON archived_customers;
DROP POLICY IF EXISTS "admin_can_delete_archived_customers" ON archived_customers;
DROP POLICY IF EXISTS "admin_can_view_archived_customers" ON archived_customers;

-- Lägg till EN policy för allt (enklare)
CREATE POLICY "authenticated_users_full_access"
ON archived_customers
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- OBS: Detta ger ALLA inloggade användare access. 
-- Byt till admin-only när det fungerar:

-- CREATE POLICY "admin_only_full_access"
-- ON archived_customers
-- FOR ALL
-- USING (
--     (SELECT is_admin FROM customers WHERE id = auth.uid()) = true
-- )
-- WITH CHECK (
--     (SELECT is_admin FROM customers WHERE id = auth.uid()) = true
-- );
