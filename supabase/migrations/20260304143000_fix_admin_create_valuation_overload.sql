begin;

-- Remove stale overloads that make PostgREST RPC resolution ambiguous.
drop function if exists public.admin_create_valuation(uuid, text, text[]);
drop function if exists public.admin_create_valuation(text, uuid, text[]);

-- Keep a single canonical signature for RPC.
create or replace function public.admin_create_valuation(
  p_customer_id uuid,
  p_analysis jsonb,
  p_image_urls text[] default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  caller_id uuid;
  v_is_admin boolean;
  inserted_row jsonb;
begin
  caller_id := auth.uid();

  if caller_id is null then
    raise exception 'Unauthorized';
  end if;

  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_admin = true
  ) into v_is_admin;

  if not v_is_admin then
    raise exception 'Forbidden';
  end if;

  insert into public.valuations as v (customer_id, analysis, image_urls, shared_with_admin)
  values (p_customer_id, p_analysis, p_image_urls, true)
  returning jsonb_build_object(
    'id', v.id,
    'customer_id', v.customer_id,
    'created_at', v.created_at
  ) into inserted_row;

  return inserted_row;
end;
$$;

grant execute on function public.admin_create_valuation(uuid, jsonb, text[]) to authenticated;

commit;
