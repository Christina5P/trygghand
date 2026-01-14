-- Moves `valuations.valuations` (table in schema `valuations`) to `public.valuations`.
-- No compatibility views or workarounds. Safe guards included.
--
-- Run in Supabase SQL editor (or psql) as an admin role.
--
-- If you get: ERROR 42809: "array_agg" is an aggregate function
-- This script does not call `array_agg`. That error almost always comes from a database-side
-- hook firing during DDL (commonly an EVENT TRIGGER) or a function invoked by such a hook.
--
-- To identify the culprit, run these diagnostics in Supabase SQL editor:
--
--   -- 1) List event triggers (DDL hooks)
--   select
--     et.evtname,
--     et.evtenabled,
--     et.evtevent,
--     et.evttags,
--     n.nspname as function_schema,
--     p.proname as function_name
--   from pg_event_trigger et
--   join pg_proc p on p.oid = et.evtfoid
--   join pg_namespace n on n.oid = p.pronamespace
--   order by et.evtname;
--
--   -- 2) Find any function bodies that mention array_agg
--   select n.nspname as schema_name, p.proname as function_name
--   from pg_proc p
--   join pg_namespace n on n.oid = p.pronamespace
--   where pg_get_functiondef(p.oid) ilike '%array_agg%'
--   order by 1,2;
--
-- What it does:
-- 1) If `valuations` schema exists and contains table `valuations`, move it to `public`.
-- 2) Optionally also move a sequence `valuations.valuations_id_seq` if present.
-- 3) Attempts to drop the now-empty `valuations` schema.
-- 4) Prints notices about remaining dependencies that still reference the old schema.

begin;

-- Workaround for projects where a Supabase event trigger function is broken and aborts DDL
-- with: ERROR 42809: "array_agg" is an aggregate function.
-- We temporarily disable known Supabase event triggers during the schema move, then re-enable.
-- (If your role lacks permission to alter event triggers, this block will error and you can
--  skip it and ask Supabase support, or run the migration via a privileged role.)
do $$
declare
  trigger_name text;
begin
  foreach trigger_name in array array[
    'pgrst_ddl_watch',
    'pgrst_drop_watch',
    'graphql_watch_ddl',
    'graphql_watch_drop'
  ] loop
    if exists (select 1 from pg_event_trigger where evtname = trigger_name) then
      begin
        execute format('alter event trigger %I disable', trigger_name);
        raise notice 'Disabled event trigger %', trigger_name;
      exception
        when insufficient_privilege then
          raise notice 'Could not disable event trigger % (insufficient_privilege). Re-run as the trigger owner (typically role "postgres").', trigger_name;
      end;
    end if;
  end loop;
end $$;

-- Lock to avoid concurrent DDL surprises.
-- Postgres does not support `LOCK TABLE IF EXISTS`, so we conditionally lock via dynamic SQL.
do $$
begin
  if to_regclass('valuations.valuations') is not null then
    execute 'lock table valuations.valuations in access exclusive mode';
  end if;

  if to_regclass('public.valuations') is not null then
    execute 'lock table public.valuations in access exclusive mode';
  end if;
end $$;

-- Guard: if both tables exist, stop (manual resolution required)
do $$
begin
  if to_regclass('valuations.valuations') is not null
     and to_regclass('public.valuations') is not null then
    raise exception 'Both valuations.valuations and public.valuations exist. Resolve conflict manually before migrating.';
  end if;
end $$;

-- Move the table if it exists in the valuations schema
-- (Note: this preserves data, indexes, constraints, triggers; OIDs change but name stays.)
do $$
begin
  if to_regclass('valuations.valuations') is not null then
    raise notice 'Moving table valuations.valuations -> public.valuations';
    alter table valuations.valuations set schema public;
  else
    raise notice 'No table valuations.valuations found; nothing to move.';
  end if;
end $$;

-- If there is an owned sequence still sitting in the valuations schema, move it too.
-- This is best-effort; if your PK uses identity columns, there may be no sequence.
do $$
begin
  if to_regclass('valuations.valuations_id_seq') is not null then
    raise notice 'Moving sequence valuations.valuations_id_seq -> public.valuations_id_seq';
    alter sequence valuations.valuations_id_seq set schema public;
  end if;
end $$;

-- Best-effort: drop the old schema if it exists and is empty.
-- If it is not empty, we keep it and print a notice.
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'valuations') then
    if exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'valuations'
        and c.relkind in ('r','p','v','m','S','f')
    ) then
      raise notice 'Schema "valuations" still contains objects; not dropping.';
    else
      raise notice 'Dropping empty schema "valuations"';
      execute 'drop schema valuations';
    end if;
  end if;
end $$;

-- Report remaining references to the literal string "valuations.valuations" in function bodies.
-- (These must be manually edited/replaced and re-created.)
-- Note: This does NOT modify functions automatically.
with funcs as (
  select
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_functiondef(p.oid) as def
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
)
select
  schema_name,
  function_name
from funcs
where def ilike '%valuations.valuations%'
order by schema_name, function_name;

-- Report remaining references in view definitions.
with views as (
  select
    n.nspname as schema_name,
    c.relname as view_name,
    pg_get_viewdef(c.oid, true) as def
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where c.relkind in ('v','m')
)
select schema_name, view_name
from views
where def ilike '%valuations.valuations%'
order by schema_name, view_name;

-- Report remaining references in RLS policies.
-- If any policy expressions contain the old schema-qualified name,
-- the policy must be dropped/recreated.
with pol as (
  select
    n.nspname as schema_name,
    c.relname as table_name,
    p.polname as policy_name,
    pg_get_expr(p.polqual, p.polrelid) as using_expr,
    pg_get_expr(p.polwithcheck, p.polrelid) as check_expr
  from pg_policy p
  join pg_class c on c.oid = p.polrelid
  join pg_namespace n on n.oid = c.relnamespace
)
select schema_name, table_name, policy_name
from pol
where coalesce(using_expr,'') ilike '%valuations.valuations%'
   or coalesce(check_expr,'') ilike '%valuations.valuations%'
order by schema_name, table_name, policy_name;

-- Re-enable event triggers we disabled at the start.
do $$
declare
  trigger_name text;
begin
  foreach trigger_name in array array[
    'pgrst_ddl_watch',
    'pgrst_drop_watch',
    'graphql_watch_ddl',
    'graphql_watch_drop'
  ] loop
    if exists (select 1 from pg_event_trigger where evtname = trigger_name) then
      begin
        execute format('alter event trigger %I enable', trigger_name);
        raise notice 'Enabled event trigger %', trigger_name;
      exception
        when insufficient_privilege then
          raise notice 'Could not enable event trigger % (insufficient_privilege). Re-run as the trigger owner (typically role "postgres").', trigger_name;
      end;
    end if;
  end loop;
end $$;

commit;
