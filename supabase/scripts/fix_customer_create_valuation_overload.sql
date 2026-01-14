-- Fix PostgREST RPC ambiguity (PGRST203) when multiple functions match the same
-- RPC name and the JSON payload can be coerced into more than one signature.
--
-- Symptom in client:
--   PGRST203: Could not choose the best candidate function between ...
--
-- Run in Supabase SQL editor as a privileged role (postgres/supabase_admin).

begin;

-- Diagnostics: list every function candidate
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as identity_args,
  p.oid
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where p.proname = 'customer_create_valuation'
order by 1, 2;

-- Case A (most common): two overloads in *public* with the same parameter names,
-- typically (text, jsonb) vs (text, text[]). A JSON array can match both, so
-- PostgREST fails to resolve.
-- We keep the text[] variant (preferred for url arrays) and rename the jsonb one.
do $$
begin
  if to_regprocedure('public.customer_create_valuation(text,text[])') is not null
     and to_regprocedure('public.customer_create_valuation(text,jsonb)') is not null
     and to_regprocedure('public.customer_create_valuation_jsonb__deprecated(text,jsonb)') is null
  then
    raise notice 'Renaming public.customer_create_valuation(text,jsonb) -> customer_create_valuation_jsonb__deprecated to remove RPC ambiguity.';
    execute 'alter function public.customer_create_valuation(text,jsonb) rename to customer_create_valuation_jsonb__deprecated';
  end if;
end $$;

-- If both public and valuations versions exist with the same signature,
-- rename the valuations one so PostgREST no longer sees an ambiguous overload.
do $$
begin
  if to_regprocedure('public.customer_create_valuation(text,text[])') is not null
     and to_regprocedure('valuations.customer_create_valuation(text,text[])') is not null
     and to_regprocedure('valuations.customer_create_valuation__deprecated(text,text[])') is null
  then
    raise notice 'Renaming valuations.customer_create_valuation(text,text[]) -> customer_create_valuation__deprecated';
    execute 'alter function valuations.customer_create_valuation(text,text[]) rename to customer_create_valuation__deprecated';
  end if;
end $$;

commit;

-- Re-check after the change
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as identity_args,
  p.oid
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where p.proname in (
  'customer_create_valuation',
  'customer_create_valuation__deprecated',
  'customer_create_valuation_jsonb__deprecated'
)
order by 1, 2;
