-- Add soft-delete columns to valuations table (GDPR-friendly deletes)
--
-- Edge Functions `customer-soft-delete-valuation` and `admin-soft-delete-valuation`
-- set `deleted_at` + `deleted_by` instead of hard deleting.
--
-- This script tries to be resilient to schema differences:
-- - If the base table is `valuations.valuations`, it alters that.
-- - If you only have a public VIEW `public.valuations` pointing to `valuations.valuations`,
--   you still must alter the BASE table (views are not alterable).

begin;

-- 1) Ensure the base table exists in either public or valuations schema.
-- 2) Add columns on the base table.

do $$
declare
  base regclass;
    base_name text;
    begin
      if to_regclass('public.valuations') is not null then
          -- This might be a table OR a view. Prefer the real table if it is a table.
              -- If it's a view, we can't alter it; we'll try `valuations.valuations` next.
                  begin
                        base := 'public.valuations'::regclass;
                              base_name := 'public.valuations';
                                    execute format('alter table %s add column if not exists deleted_at timestamptz null', base_name);
                                          execute format('alter table %s add column if not exists deleted_by uuid null', base_name);
                                                raise notice 'Added soft-delete columns on %', base_name;
                                                      return;
                                                          exception when others then
                                                                -- Likely a view or insufficient privileges; fall through.
                                                                      raise notice 'Could not alter public.valuations (maybe a VIEW). Will try valuations.valuations. Error: %', sqlerrm;
                                                                          end;
                                                                            end if;

                                                                              if to_regclass('valuations.valuations') is not null then
                                                                                  base := 'valuations.valuations'::regclass;
                                                                                      base_name := 'valuations.valuations';
                                                                                          execute format('alter table %s add column if not exists deleted_at timestamptz null', base_name);
                                                                                              execute format('alter table %s add column if not exists deleted_by uuid null', base_name);
                                                                                                  raise notice 'Added soft-delete columns on %', base_name;
                                                                                                      return;
                                                                                                        end if;

                                                                                                          raise exception 'No valuations table found (public.valuations or valuations.valuations).';
                                                                                                          end $$;

                                                                                                          -- Optional index for faster filtering
                                                                                                          -- create index if not exists valuations_customer_deleted_at_idx
                                                                                                          --   on valuations.valuations(customer_id, deleted_at);
                                                                                                          -- Or if your table is public:
                                                                                                          -- create index if not exists valuations_customer_deleted_at_idx
                                                                                                          --   on public.valuations(customer_id, deleted_at);

                                                                                                          commit;
                                                                                                          