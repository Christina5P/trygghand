-- Create Storage bucket + RLS policies for fullmakter (uploaded documents + templates)
--
-- Bucket: fullmakts-filer (private)
--
-- Paths used in the codebase today (legacy + current):
-- - fullmaktsmallar/<filename>                     (templates)
-- - fullmakter/<auth_user_id>/<filename>           (customer uploads)
-- - fullmakter/kund/<customer_id>/<filename>       (admin uploads for a customer)
--
-- SECURITY MODEL
-- - Admin: can read/write all objects in the bucket (role from public.user_roles)
-- - Customer: can read objects that are referenced by their own `public.fullmakter` rows
--             (NOT based on storage owner), and can upload into their own prefix.
-- - Hard delete: blocked for authenticated clients (recommended)
--
-- Run in Supabase SQL editor.

-- 1) Create bucket if missing
insert into storage.buckets (id, name, public)
values ('fullmakts-filer', 'fullmakts-filer', false)
on conflict (id) do nothing;

-- 2) NOTE ABOUT PERMISSIONS
-- In hosted Supabase, `storage.objects` is owned by `supabase_storage_admin`.
-- If you get: "must be owner of table objects", run this first in SQL editor:
--   set role supabase_storage_admin;

-- 3) Admin policies (select/insert)
-- Admin role source is ONLY `public.user_roles`.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='storage' and tablename='objects'
      and policyname='fullmakts_admin_select'
  ) then
    create policy fullmakts_admin_select
      on storage.objects for select
      using (
        bucket_id = 'fullmakts-filer'
        and exists (
          select 1
          from public.user_roles ur
          where ur.user_id = auth.uid()
            and ur.role = 'admin'
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='storage' and tablename='objects'
      and policyname='fullmakts_admin_insert'
  ) then
    create policy fullmakts_admin_insert
      on storage.objects for insert
      with check (
        bucket_id = 'fullmakts-filer'
        and exists (
          select 1
          from public.user_roles ur
          where ur.user_id = auth.uid()
            and ur.role = 'admin'
        )
      );
  end if;
end $$;

-- 4) Customer read policy (NOT owner-based)
-- A customer can read an object if there exists a `public.fullmakter` row that:
-- - references this exact storage path, AND
-- - is tied to the logged-in user (fullmaktsgivare = auth.uid())
--
-- This supports both prefixes (fullmakter/<uid>/... and fullmakter/kund/<uid>/...).
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='storage' and tablename='objects'
      and policyname='fullmakts_customer_select'
  ) then
    create policy fullmakts_customer_select
      on storage.objects for select
      using (
        bucket_id = 'fullmakts-filer'
        and exists (
          select 1
          from public.fullmakter f
          where f.fullmaktsgivare = auth.uid()
            and (
              f.dokument_url = name
              or f.storage_path = name
            )
        )
      );
  end if;
end $$;

-- 5) Customer upload policy (insert)
-- Allow uploads only into the user's own namespace.
-- Note: This does NOT rely on storage.objects.owner.
--
-- Supported customer upload format from the current customer portal:
--   name = 'fullmakter/<auth.uid()>/<filename>'
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='storage' and tablename='objects'
      and policyname='fullmakts_customer_insert'
  ) then
    create policy fullmakts_customer_insert
      on storage.objects for insert
      with check (
        bucket_id = 'fullmakts-filer'
        and split_part(name,'/',1) = 'fullmakter'
        and split_part(name,'/',2) = auth.uid()::text
      );
  end if;
end $$;

-- 6) Optional: block deletes from clients (recommended)
-- If you already have a broad delete policy, consider removing/locking it down.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='storage' and tablename='objects'
      and policyname='fullmakts_no_delete'
  ) then
    create policy fullmakts_no_delete
      on storage.objects
      for delete
      to authenticated
      using (false);
  end if;
end $$;

-- 7) Verify active policies
-- select policyname, cmd from pg_policies where schemaname='storage' and tablename='objects' order by policyname;
