-- Minimal soft-delete support for valuations.
-- Fixes PostgREST PGRST204: "Could not find the 'deleted_at' column of 'valuations'".

begin;

alter table public.valuations
  add column if not exists deleted_at timestamptz null;

-- Required by existing Edge Functions + INSTEAD OF trigger logic for public.valuations.
alter table public.valuations
  add column if not exists deleted_by uuid null;

commit;
