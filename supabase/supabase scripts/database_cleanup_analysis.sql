-- ========================================
-- SUPABASE DATABASE CLEANUP ANALYSIS
-- ========================================
-- Detta script analyserar Supabase-databasen och identifierar:
-- 1. Oanvända auth-tabeller (MFA, OAuth etc som inte används i appen)
-- 2. Oanvända storage buckets
-- 3. Potentiella optimeringar
-- 
-- Kör detta script i Supabase SQL Editor för att se rekommendationer
-- ========================================

-- ========================================
-- ANVÄND ANALYS
-- ========================================

-- Appens ANVÄNDA tabeller (public schema):
-- ✅ customers - Kundregister
-- ✅ archived_customers - Arkiverade kunder
-- ✅ cases - Ärenden
-- ✅ case_comments - Ärendekommentarer
-- ✅ contact_requests - Kontaktförfrågningar
-- ✅ subscriptions - Prenumerationer
-- ✅ subscription_cancellations - Prenumerationsavslut
-- ✅ cancellation_comments - Kommentarer till avslut
-- ✅ fullmakter - Fullmakter
-- ✅ valuations - Värderingar

-- Appens ANVÄNDA storage buckets:
-- ✅ fullmakts-filer - Fullmaktsdokument
-- ✅ abonnemang - Abonnemangsdokument
-- ✅ images - Bilder för värderingar

-- Appens ANVÄNDA auth-tabeller (hanteras av Supabase Auth):
-- ✅ auth.users - Användare
-- ✅ auth.identities - Identiteter (email/oauth)
-- ✅ auth.refresh_tokens - Session tokens (används i revokeSessions.ts)
-- ✅ auth.sessions - Användarsessioner (implicit via Supabase Auth)
-- ✅ auth.audit_log_entries - Säkerhetslogg (login, logout, signup, delete, password reset etc)

-- ========================================
-- OANVÄNDA AUTH-TABELLER
-- ========================================

-- Dessa auth-tabeller används INTE i appen och kan ignoreras:
-- ❌ auth.mfa_factors - Multi-factor authentication (ej implementerat)
-- ❌ auth.mfa_challenges - MFA challenges (ej implementerat)
-- ❌ auth.mfa_amr_claims - MFA claims (ej implementerat)
-- ❌ auth.oauth_clients - OAuth klienter (ej implementerat)
-- ❌ auth.oauth_authorizations - OAuth auktoriseringar (ej implementerat)
-- ❌ auth.oauth_consents - OAuth samtycken (ej implementerat)
-- ❌ auth.one_time_tokens - Engångstokens (hanteras internt av Supabase)
-- ❌ auth.flow_state - OAuth flow state (ej implementerat)
-- ❌ auth.instances - Auth instanser (legacy, används ej)

-- REKOMMENDATION: Dessa tabeller är en del av Supabase Auth och behöver INTE raderas.
-- De tar upp minimal plats och kan behövas i framtiden om du implementerar:
-- - MFA (Multi-Factor Authentication)
-- - OAuth-inloggning (Google, GitHub etc)
-- - Audit logging

-- ========================================
-- KONTROLLERA OANVÄNDA PUBLIC TABELLER
-- ========================================

-- Visa alla tabeller i public schema
SELECT 
    table_name,
    pg_size_pretty(pg_total_relation_size(quote_ident(table_name)::regclass)) as size,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND columns.table_name = tables.table_name) as column_count
FROM 
    information_schema.tables
WHERE 
    table_schema = 'public'
    AND table_type = 'BASE TABLE'
ORDER BY 
    pg_total_relation_size(quote_ident(table_name)::regclass) DESC;

-- Om du ser tabeller som INTE finns i listan över "ANVÄNDA tabeller" ovan,
-- kan du ta bort dem med:
-- DROP TABLE IF EXISTS <table_name>;

-- ========================================
-- KONTROLLERA STORAGE BUCKETS
-- ========================================

-- Visa alla storage buckets
SELECT 
    id,
    name,
    public,
    created_at
FROM 
    storage.buckets
ORDER BY 
    name;

-- Förväntat resultat (ANVÄNDA buckets):
-- ✅ fullmakts-filer
-- ✅ abonnemang
-- ✅ images

-- Om du ser buckets som INTE används, ta bort dem via Supabase Dashboard:
-- Storage → Bucket → Settings → Delete bucket

-- ========================================
-- DATABASOPTIMERING
-- ========================================

-- 1. Kontrollera index-användning
SELECT 
    schemaname as schema,
    relname as table,
    indexrelname as index,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM 
    pg_stat_user_indexes
WHERE 
    schemaname = 'public'
ORDER BY 
    idx_scan DESC
LIMIT 50;

-- Om idx_scan är 0 för ett index, kan det vara oanvänt

-- 2. Kontrollera tabellstorlekar
SELECT 
    table_schema as schema,
    table_name as table,
    pg_size_pretty(pg_total_relation_size(quote_ident(table_schema)||'.'||quote_ident(table_name))) as total_size,
    pg_size_pretty(pg_relation_size(quote_ident(table_schema)||'.'||quote_ident(table_name))) as table_size,
    pg_size_pretty(pg_total_relation_size(quote_ident(table_schema)||'.'||quote_ident(table_name)) - pg_relation_size(quote_ident(table_schema)||'.'||quote_ident(table_name))) as index_size
FROM 
    information_schema.tables
WHERE 
    table_schema = 'public'
    AND table_type = 'BASE TABLE'
ORDER BY 
    pg_total_relation_size(quote_ident(table_schema)||'.'||quote_ident(table_name)) DESC;

-- ========================================
-- POTENTIELLA FÖRBÄTTRINGAR
-- ========================================

-- 1. LÄGG TILL INDEX för bättre prestanda (om de inte redan finns):

-- Index för customers-tabellen
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_is_customer ON customers(is_customer);

-- Index för cases-tabellen
CREATE INDEX IF NOT EXISTS idx_cases_customer_id ON cases(customer_id);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_created_at ON cases(created_at DESC);

-- Index för case_comments
CREATE INDEX IF NOT EXISTS idx_case_comments_case_id ON case_comments(case_id);
CREATE INDEX IF NOT EXISTS idx_case_comments_created_at ON case_comments(created_at DESC);

-- Index för fullmakter
CREATE INDEX IF NOT EXISTS idx_fullmakter_fullmaktsgivare ON fullmakter(fullmaktsgivare);
CREATE INDEX IF NOT EXISTS idx_fullmakter_fullmakthavare ON fullmakter(fullmakthavare);

-- Index för subscription_cancellations
CREATE INDEX IF NOT EXISTS idx_subscription_cancellations_customer_id ON subscription_cancellations(customer_id);
CREATE INDEX IF NOT EXISTS idx_subscription_cancellations_status ON subscription_cancellations(status);

-- OBS: valuations är en VIEW, inte en tabell - index skapas på den underliggande tabellen

-- 2. LÄGG TILL FOREIGN KEY CONSTRAINTS (om de inte redan finns):
-- Detta säkerställer dataintegritet

-- Exempel (justera efter dina faktiska kolumnnamn):
-- ALTER TABLE cases ADD CONSTRAINT fk_cases_customer 
--   FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;

-- ALTER TABLE case_comments ADD CONSTRAINT fk_comments_case 
--   FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE;

-- ========================================
-- AUDIT LOGGING (VALFRITT)
-- ========================================

-- Om du vill aktivera audit logging för säkerhet och spårbarhet,
-- kan du använda auth.audit_log_entries-tabellen.
-- Den är tom nu men kan fyllas av Supabase Auth vid viktiga händelser.

-- För att se audit logs:
SELECT 
    id,
    created_at,
    payload->>'action' as action,
    payload->>'actor_id' as actor_id,
    ip_address
FROM 
    auth.audit_log_entries
ORDER BY 
    created_at DESC
LIMIT 100;

-- ========================================
-- SAMMANFATTNING
-- ========================================

-- ✅ ANVÄND ANALYS:
-- - public schema: 10 tabeller används aktivt
-- - storage: 3 buckets används aktivt
-- - auth schema: 5 tabeller används (users, identities, refresh_tokens, sessions, audit_log_entries)

-- ❌ OANVÄNDA MEN SÄKRA ATT BEHÅLLA:
-- - auth.mfa_* tabeller (kan behövas senare)
-- - auth.oauth_* tabeller (kan behövas senare)
-- - auth.one_time_tokens (Supabase internt)
-- - auth.audit_log_entries (bra för säkerhet)

-- 💡 REKOMMENDATIONER:
-- 1. Lägg till index (se ovan) för bättre prestanda
-- 2. Lägg till foreign keys för dataintegritet
-- 3. Behåll alla auth-tabeller (de tar minimal plats)
-- 4. Kontrollera public-tabeller - ta bara bort om du hittar extra tabeller
-- 5. Kontrollera storage buckets - ta bara bort om du hittar extra buckets

-- ========================================
-- SLUTSATS
-- ========================================
-- Din Supabase-databas är VÄLORGANISERAD och INGA stora städningar behövs!
-- Auth-tabellerna är standard från Supabase och ska behållas.
-- Fokusera istället på att lägga till index för bättre prestanda.
