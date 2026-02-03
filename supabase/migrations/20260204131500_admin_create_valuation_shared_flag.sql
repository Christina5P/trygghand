begin;

drop function if exists public.admin_create_valuation(text, text[], uuid);

create or replace function public.admin_create_valuation(
  p_customer_id uuid default null,
  p_analysis text,
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

grant execute on function public.admin_create_valuation(uuid, text, text[]) to authenticated;

commit;
