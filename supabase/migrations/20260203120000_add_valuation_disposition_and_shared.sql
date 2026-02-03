-- Store valuation disposition (enum-like code) and admin sharing flag.
-- Personal data; stored for service delivery (contract).

begin;

alter table public.valuations
  add column if not exists disposition_code text;

alter table public.valuations
  add column if not exists shared_with_admin boolean not null default true;

alter table public.valuations
  drop constraint if exists valuations_disposition_code_check;

alter table public.valuations
  add constraint valuations_disposition_code_check
  check (disposition_code is null or disposition_code in ('sell', 'donate', 'keep', 'discard'));

-- Ensure RLS is enabled and policies are minimal.
alter table public.valuations enable row level security;

-- Customer can read own valuations (used by RPCs and direct reads).
drop policy if exists valuations_select_own on public.valuations;
create policy valuations_select_own on public.valuations
  for select
  to authenticated
  using (customer_id = auth.uid() and deleted_at is null);

-- Customer can update own disposition/share flags only (column-level restriction not enforced by RLS).
drop policy if exists valuations_update_own on public.valuations;
create policy valuations_update_own on public.valuations
  for update
  to authenticated
  using (customer_id = auth.uid())
  with check (customer_id = auth.uid());

-- Admin can only read shared rows.
drop policy if exists valuations_select_admin_shared on public.valuations;
create policy valuations_select_admin_shared on public.valuations
  for select
  to authenticated
  using (
    shared_with_admin = true
    and (
      exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
    )
  );

-- Update customer_get_my_valuations to include disposition/share flags.
create or replace function public.customer_get_my_valuations()
returns setof jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  return query
  with base as (
    select
      v.id,
      v.customer_id,
      v.analysis,
      v.image_urls,
      v.created_at,
      v.disposition_code,
      v.shared_with_admin,
      row_number() over (
        partition by v.customer_id
        order by v.created_at asc nulls last, v.id asc
      ) as valuation_number
    from public.valuations v
    where v.customer_id = auth.uid()
      and v.deleted_at is null
  )
  select
    jsonb_build_object(
      'id', b.id,
      'customer_id', b.customer_id,
      'analysis', b.analysis,
      'image_urls', b.image_urls,
      'created_at', b.created_at,
      'disposition_code', b.disposition_code,
      'shared_with_admin', b.shared_with_admin,
      'number', b.valuation_number,
      'title', 'Vardering ' || b.valuation_number
    )
  from base b
  order by b.created_at desc nulls last, b.id desc;
end;
$$;

grant execute on function public.customer_get_my_valuations() to authenticated;

commit;
