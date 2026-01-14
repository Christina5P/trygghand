-- Grant privileges for valuations table to service_role
--
-- This repository no longer supports a separate `valuations` schema.
-- Run as a privileged role (postgres/supabase_admin) in Supabase SQL editor.

begin;

do $$
begin
  -- public schema access is typically already allowed, but keep it explicit.
  execute 'grant usage on schema public to service_role';

  if to_regclass('public.valuations') is null then
    raise notice 'public.valuations does not exist. Nothing to grant.';
    return;
  end if;

  execute 'grant select, insert, update, delete on table public.valuations to service_role';
  raise notice 'Granted table privileges on public.valuations to service_role.';
end $$;

commit;
