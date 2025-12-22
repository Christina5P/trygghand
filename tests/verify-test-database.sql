-- ==========================================
-- VERIFIERING AV TEST-DATABAS
-- ==========================================
-- Detta script kontrollerar att alla tabeller och policies finns
-- Kör detta EFTER att du har kört setup-test-database.sql
-- ==========================================

-- ============================================
-- 1. KONTROLLERA ALLA TABELLER
-- ============================================
SELECT 
  'Tabellstatus' as check_type,
  tablename,
  'Exists' as status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'customers', 
    'service_types', 
    'subscriptions', 
    'cases', 
    'case_subscriptions', 
    'contact_requests', 
    'case_comments', 
    'storage_items', 
    'valuations', 
    'subscription_cancellations', 
    'cancellation_comments', 
    'fullmakter', 
    'archived_customers'
  )
ORDER BY tablename;

-- ============================================
-- 2. KONTROLLERA RLS (Row Level Security)
-- ============================================
SELECT 
  'RLS Status' as check_type,
  schemaname, 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'customers', 
    'cases', 
    'case_subscriptions', 
    'case_comments', 
    'storage_items', 
    'contact_requests', 
    'valuations', 
    'subscription_cancellations', 
    'cancellation_comments', 
    'fullmakter', 
    'archived_customers'
  )
ORDER BY tablename;

-- ============================================
-- 3. RÄKNA POLICIES PER TABELL
-- ============================================
SELECT 
  'Policy Count' as check_type,
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- ============================================
-- 4. LISTA ALLA POLICIES
-- ============================================
SELECT 
  'Policy Details' as check_type,
  tablename,
  policyname,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================
-- 5. KONTROLLERA TRIGGERS
-- ============================================
SELECT 
  'Trigger Status' as check_type,
  trigger_name,
  event_object_table as table_name,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name LIKE '%updated_at%'
ORDER BY event_object_table;

-- ============================================
-- 6. KONTROLLERA INDEXES
-- ============================================
SELECT 
  'Index Status' as check_type,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('archived_customers')
ORDER BY tablename, indexname;

-- ============================================
-- 7. RÄKNA GRUNDDATA
-- ============================================
SELECT 'Service Types Count' as check_type, COUNT(*) as count FROM service_types
UNION ALL
SELECT 'Subscriptions Count', COUNT(*) FROM subscriptions
UNION ALL
SELECT 'Customers Count', COUNT(*) FROM customers
UNION ALL
SELECT 'Contact Requests Count', COUNT(*) FROM contact_requests;

-- ============================================
-- 8. KONTROLLERA KOLUMNER I CONTACT_REQUESTS
-- ============================================
SELECT 
  'Contact Requests Columns' as check_type,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'contact_requests'
ORDER BY ordinal_position;

-- ============================================
-- 9. KONTROLLERA KOLUMNER I CUSTOMERS
-- ============================================
SELECT 
  'Customers Columns' as check_type,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'customers'
ORDER BY ordinal_position;

-- ============================================
-- SAMMANFATTNING
-- ============================================
SELECT 
  '============================================' as summary,
  'VERIFIERING KLAR' as status,
  '============================================' as end_line;

-- Förväntat resultat:
-- - 13 tabeller ska finnas
-- - RLS ska vara enabled på de flesta tabeller
-- - Varje tabell ska ha minst 1-3 policies
-- - updated_at triggers ska finnas på 6 tabeller
-- - 3 indexes på archived_customers
-- - 7 service_types
-- - 17 subscriptions (pre-populated)
