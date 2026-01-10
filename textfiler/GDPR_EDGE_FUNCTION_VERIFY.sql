-- GDPR Edge Functions / RLS verification (manual)
-- Kör i Supabase SQL Editor.

-- 1) Kontrollera soft-delete-kolumner
select table_name, column_name
from information_schema.columns
where table_schema = 'public'
  and table_name in ('valuations','customers','contact_requests','case_comments','cancellation_comments')
  and column_name in ('deleted_at','deleted_by')
order by table_name, column_name;

-- 2) Kontrollera att RLS är på för valuations + admin_audit_log
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname='public'
  and tablename in ('valuations','admin_audit_log');

-- 3) Kontrollera policies (bör inte finnas UPDATE/DELETE policies för valuations från authenticated)
select tablename, policyname, permissive, roles, cmd
from pg_policies
where schemaname='public'
  and tablename in ('valuations','admin_audit_log')
order by tablename, policyname;

-- 4) Kontrollera att audit-logg är skrivbar server-side (service role)
-- Not: detta kan inte verifieras fullt ut i SQL Editor utan att köra via Edge Function.
-- Verifiera genom att köra en Edge Function (soft delete) och sedan:
select *
from public.admin_audit_log
order by created_at desc
limit 20;
