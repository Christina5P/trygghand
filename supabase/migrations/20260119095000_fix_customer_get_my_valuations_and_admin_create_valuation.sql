-- Fixes customer login error PGRST202 by ensuring RPC exists with zero parameters.
-- Also adds per-customer numbering/title in result (no data migration required).
-- Adds an admin RPC to create a valuation for a specific customer.

begin;

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
      'number', b.valuation_number,
      'title', 'Värdering ' || b.valuation_number
    )
  from base b
  order by b.created_at desc nulls last, b.id desc;
end;
$$;

grant execute on function public.customer_get_my_valuations() to authenticated;

create or replace function public.admin_create_valuation(
  p_analysis text,
  p_customer_id uuid default null,
  p_image_urls text[] default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  caller_id uuid;
  is_admin boolean;
  inserted_row jsonb;
begin
  caller_id := auth.uid();

  if caller_id is null then
    raise exception 'Unauthorized';
  end if;

  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and is_admin = true
  ) into is_admin;

  if not is_admin then
    raise exception 'Forbidden';
  end if;

  insert into public.valuations as v (customer_id, analysis, image_urls)
  values (p_customer_id, p_analysis, p_image_urls)
  returning jsonb_build_object(
    'id', v.id,
    'customer_id', v.customer_id,
    'created_at', v.created_at
  ) into inserted_row;

  return inserted_row;
end;
$$;

grant execute on function public.admin_create_valuation(text, uuid, text[]) to authenticated;

create or replace function public.admin_set_valuation_customer(
  p_valuation_id uuid,
  p_customer_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  is_admin boolean;
  updated_row jsonb;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and is_admin = true
  ) into is_admin;

  if not is_admin then
    raise exception 'Forbidden';
  end if;

  update public.valuations as v
  set customer_id = p_customer_id
  where v.id = p_valuation_id
  returning jsonb_build_object(
    'id', v.id,
    'customer_id', v.customer_id,
    'created_at', v.created_at
  ) into updated_row;

  return updated_row;
end;
$$;

grant execute on function public.admin_set_valuation_customer(uuid, uuid) to authenticated;

commit;
