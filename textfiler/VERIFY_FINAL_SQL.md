/* ============================================================
   VERIFY_FINAL.sql
   Slutverifiering – GDPR & Security (Supabase / Postgres)
   ============================================================ */

-- ============================================================
-- 1. Verifiera att RLS är aktiverat på alla publika tabeller
-- ============================================================

SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- EXPECTED:
-- rls_enabled = true för alla tabeller med persondata


-- ============================================================
-- 2. Verifiera att inga tabeller saknar RLS-policies
-- ============================================================

SELECT
  t.schemaname,
  t.tablename
FROM pg_tables t
LEFT JOIN pg_policies p
  ON p.schemaname = t.schemaname
 AND p.tablename = t.tablename
WHERE t.schemaname = 'public'
GROUP BY t.schemaname, t.tablename
HAVING COUNT(p.policyname) = 0;

-- EXPECTED:
-- 0 rows


-- ============================================================
-- 3. Verifiera att alla SECURITY DEFINER-funktioner
--    har låst search_path
-- ============================================================

SELECT
  p.proname,
  pg_get_function_identity_arguments(p.oid) AS args,
  p.prosecdef AS security_definer,
  p.proconfig
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prosecdef = true
ORDER BY p.proname;

-- EXPECTED:
-- proconfig innehåller ["search_path=public"] på samtliga rader


-- ============================================================
-- 4. Kontrollera att inga osäkra search_path-funktioner finns
-- ============================================================

SELECT
  p.proname,
  pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prosecdef = true
  AND (
    p.proconfig IS NULL
    OR NOT p.proconfig::text LIKE '%search_path=public%'
  );

-- EXPECTED:
-- 0 rows


-- ============================================================
-- 5. Verifiera admin-roll (RBAC)
-- ============================================================

SELECT
  u.email,
  r.role
FROM auth.users u
JOIN public.user_roles r
  ON r.user_id = u.id
ORDER BY u.email;

-- EXPECTED:
-- Minst en användare med role = 'admin'


-- ============================================================
-- 6. Verifiera att skyddade tabeller är blockerade för klienter
-- ============================================================

SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename IN (
  'customer_comments',
  'deleted_users_log',
  'valuations_backup'
)
ORDER BY tablename;

-- EXPECTED:
-- Policy: "No client access"
-- cmd = ALL
-- roles = {public}


-- ============================================================
-- 7. Verifiera STORAGE policies (ägarskap & admin)
-- ============================================================

SELECT
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE schemaname = 'storage'
ORDER BY policyname;

-- EXPECTED:
-- Owner-baserade SELECT/INSERT/DELETE
-- Admin ALL-access
-- Service_role ALL-access


-- ============================================================
-- 8. Slutstatus – sammanfattning
-- ============================================================

SELECT
  'VERIFY_FINAL.sql completed successfully' AS status,
  NOW() AS verified_at;
