begin;

create table if not exists public.key_receipts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid null,
  created_by uuid not null,
  key_count int not null,
  description text null,
  signed_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.key_receipts enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='key_receipts'
      and policyname='key_receipts_admin_all'
  ) then
    create policy key_receipts_admin_all
      on public.key_receipts
      for all
      using (
        exists (
          select 1
          from public.profiles
          where id = auth.uid()
            and is_admin = true
        )
      )
      with check (
        exists (
          select 1
          from public.profiles
          where id = auth.uid()
            and is_admin = true
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='key_receipts'
      and policyname='key_receipts_customer_select_own'
  ) then
    create policy key_receipts_customer_select_own
      on public.key_receipts
      for select
      using (customer_id = auth.uid());
  end if;
end $$;

insert into storage.buckets (id, name, public)
values ('key-receipts', 'key-receipts', false)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='storage' and tablename='objects'
      and policyname='key_receipts_admin_select'
  ) then
    create policy key_receipts_admin_select
      on storage.objects for select
      using (
        bucket_id = 'key-receipts'
        and exists (
          select 1
          from public.profiles
          where id = auth.uid()
            and is_admin = true
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='storage' and tablename='objects'
      and policyname='key_receipts_admin_insert'
  ) then
    create policy key_receipts_admin_insert
      on storage.objects for insert
      with check (
        bucket_id = 'key-receipts'
        and exists (
          select 1
          from public.profiles
          where id = auth.uid()
            and is_admin = true
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='storage' and tablename='objects'
      and policyname='key_receipts_customer_select'
  ) then
    create policy key_receipts_customer_select
      on storage.objects for select
      using (
        bucket_id = 'key-receipts'
        and name ~ '^key-receipts/[0-9a-fA-F-]{36}/signature\\.png$'
        and exists (
          select 1
          from public.key_receipts kr
          where kr.id = split_part(name,'/',2)::uuid
            and kr.customer_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='storage' and tablename='objects'
      and policyname='key_receipts_customer_insert'
  ) then
    create policy key_receipts_customer_insert
      on storage.objects for insert
      with check (
        bucket_id = 'key-receipts'
        and name ~ '^key-receipts/[0-9a-fA-F-]{36}/signature\\.png$'
        and exists (
          select 1
          from public.key_receipts kr
          where kr.id = split_part(name,'/',2)::uuid
            and kr.customer_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='storage' and tablename='objects'
      and policyname='key_receipts_no_delete'
  ) then
    create policy key_receipts_no_delete
      on storage.objects
      for delete
      to authenticated
      using (false);
  end if;
end $$;

create or replace function public.admin_create_key_receipt(
  p_customer_id uuid default null,
  p_key_count int,
  p_description text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  is_admin boolean;
  new_id uuid;
  signed_ts timestamptz;
  created_ts timestamptz;
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

  insert into public.key_receipts (customer_id, created_by, key_count, description, signed_at)
  values (p_customer_id, auth.uid(), p_key_count, p_description, now())
  returning id, signed_at, created_at into new_id, signed_ts, created_ts;

  return jsonb_build_object(
    'id', new_id,
    'customer_id', p_customer_id,
    'key_count', p_key_count,
    'description', p_description,
    'signed_at', signed_ts,
    'created_at', created_ts
  );
end;
$$;

grant execute on function public.admin_create_key_receipt(uuid, int, text) to authenticated;

create or replace function public.admin_get_key_receipts()
returns setof jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  is_admin boolean;
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

  return query
  select jsonb_build_object(
    'id', kr.id,
    'customer_id', kr.customer_id,
    'created_by', kr.created_by,
    'key_count', kr.key_count,
    'description', kr.description,
    'signed_at', kr.signed_at,
    'created_at', kr.created_at
  )
  from public.key_receipts kr
  order by kr.created_at desc;
end;
$$;

grant execute on function public.admin_get_key_receipts() to authenticated;

create or replace function public.customer_get_my_key_receipts()
returns setof jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  return query
  select jsonb_build_object(
    'id', kr.id,
    'key_count', kr.key_count,
    'description', kr.description,
    'signed_at', kr.signed_at,
    'created_at', kr.created_at
  )
  from public.key_receipts kr
  where kr.customer_id = auth.uid()
  order by kr.created_at desc;
end;
$$;

grant execute on function public.customer_get_my_key_receipts() to authenticated;

commit;
