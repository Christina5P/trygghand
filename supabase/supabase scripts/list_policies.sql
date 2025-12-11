-- ========================================
-- LIST ALL RLS POLICIES (ALL SCHEMAS)
-- Run in Supabase SQL Editor
-- ========================================

-- 1) All policies with details
SELECT 
    pol.schemaname,
    pol.tablename,
    pol.policyname,
    pol.permissive,
    pol.roles,
    pol.cmd,
    pol.qual AS using_expression,
    pol.with_check AS check_expression
FROM pg_policies pol
ORDER BY pol.schemaname, pol.tablename, pol.policyname;

-- Uses pg_class to read relrowsecurity (enabled) and relforcerowsecurity (forced)
SELECT 
        n.nspname AS schemaname,
        c.relname AS tablename,
        c.relrowsecurity AS rls_enabled,
        c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'r'  -- ordinary tables
    AND c.relrowsecurity = true
ORDER BY n.nspname, c.relname;
