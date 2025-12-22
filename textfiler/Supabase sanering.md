-- Policies
SELECT *
FROM pg_policies
ORDER BY schemaname, tablename;

-- Funktioner
SELECT proname, prosrc
FROM pg_proc
JOIN pg_namespace n ON n.oid = pg_proc.pronamespace
WHERE n.nspname = 'public';

-- Triggers
SELECT tgname, tgrelid::regclass
FROM pg_trigger
WHERE NOT tgisinternal;
