-- Grant privileges on schema valuations to service_role
--
-- Fixes Edge Function errors like:
--   permission denied for schema valuations (code 42501)
-- when the base table lives in `valuations.valuations` or views reference that schema.
--
-- Run as a privileged role (postgres/supabase_admin) in Supabase SQL editor.

begin;

do $$
begin
  if to_regnamespace('valuations') is null then
    raise notice 'Schema valuations does not exist. Nothing to grant.';
    return;
  end if;

  -- Allow service_role to access objects in the schema
  execute 'grant usage on schema valuations to service_role';

  -- Table privileges (covers valuations.valuations and any future tables)
  execute 'grant select, insert, update, delete on all tables in schema valuations to service_role';

  -- Sequence privileges (for identity/serial)
  execute 'grant usage, select on all sequences in schema valuations to service_role';

  -- Default privileges for objects created later
  execute 'alter default privileges in schema valuations grant select, insert, update, delete on tables to service_role';
  execute 'alter default privileges in schema valuations grant usage, select on sequences to service_role';

  raise notice 'Granted schema/table/sequence privileges in schema valuations to service_role.';
end $$;

commit;
