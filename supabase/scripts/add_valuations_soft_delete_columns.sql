-- Add soft-delete columns to public.valuations (GDPR-friendly deletes)
--
-- Edge Functions `customer-soft-delete-valuation` and `admin-soft-delete-valuation`
-- set `deleted_at` + `deleted_by` instead of hard deleting.
--
-- This repository no longer supports a separate `valuations` schema or compatibility VIEWs.

begin;

-- 1) Ensure the base table exists in either public or valuations schema.
-- 2) Add columns on the base table.

do $$
declare
begin
  if to_regclass('public.valuations') is null then
    raise exception 'No valuations table found (public.valuations).';
  end if;

  execute 'alter table public.valuations add column if not exists deleted_at timestamptz null';
  execute 'alter table public.valuations add column if not exists deleted_by uuid null';
  raise notice 'Added soft-delete columns on public.valuations';
end $$;

                                                                                                          -- Optional index for faster filtering
                                                                                                          -- create index if not exists valuations_customer_deleted_at_idx
                                                                                                          --   on public.valuations(customer_id, deleted_at);

                                                                                                          commit;
                                                                                                          