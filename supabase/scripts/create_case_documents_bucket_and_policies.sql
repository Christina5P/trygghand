-- Create Storage bucket + RLS policies for case documents
--
-- Bucket: case-documents (private)
-- Object key format: cases/<case_id>/<uuid>.<ext>
--
-- WHY THIS IS NEEDED
-- The frontend uses `supabase.storage.from('case-documents').createSignedUrl(...)`.
-- For private buckets, that requires Storage RLS policies on storage.objects.
--
-- Safe model:
-- - Admin: can read/write all objects in bucket
-- - Customer: can read/write objects that belong to their own cases
--
-- Run in Supabase SQL editor.

-- 1) Create bucket if missing
insert into storage.buckets (id, name, public)
values ('case-documents', 'case-documents', false)
on conflict (id) do nothing;

-- 2) NOTE ABOUT PERMISSIONS
-- In hosted Supabase, `storage.objects` is owned by `supabase_storage_admin`.
-- If you get: "must be owner of table objects", run this first in SQL editor:
--   set role supabase_storage_admin;
-- and then run the policy blocks below.
-- (RLS is already enabled on storage.objects in Supabase Storage.)

-- 3) Helper predicates (inline)
-- We parse the case id from the object key:
-- name = 'cases/<case_uuid>/<filename>'
-- split_part(name,'/',1) = 'cases'
-- split_part(name,'/',2) = <case_uuid>

-- 4) Admin policies (select/insert)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='storage' and tablename='objects'
      and policyname='case_documents_admin_select'
  ) then
    create policy case_documents_admin_select
      on storage.objects for select
      using (
        bucket_id = 'case-documents'
        and (
          exists (
            select 1
            from public.user_roles ur
            where ur.user_id = auth.uid()
              and ur.role = 'admin'
          )
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='storage' and tablename='objects'
      and policyname='case_documents_admin_insert'
  ) then
    create policy case_documents_admin_insert
      on storage.objects for insert
      with check (
        bucket_id = 'case-documents'
        and (
          exists (
            select 1
            from public.user_roles ur
            where ur.user_id = auth.uid()
              and ur.role = 'admin'
          )
        )
      );
  end if;
end $$;

-- 5) Customer policies (select/insert for their own cases)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='storage' and tablename='objects'
      and policyname='case_documents_customer_select'
  ) then
    create policy case_documents_customer_select
      on storage.objects for select
      using (
        bucket_id = 'case-documents'
        and split_part(name,'/',1) = 'cases'
        and exists (
          select 1 from public.cases c
          where c.id::text = split_part(name,'/',2)
            and c.customer_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='storage' and tablename='objects'
      and policyname='case_documents_customer_insert'
  ) then
    create policy case_documents_customer_insert
      on storage.objects for insert
      with check (
        bucket_id = 'case-documents'
        and split_part(name,'/',1) = 'cases'
        and exists (
          select 1 from public.cases c
          where c.id::text = split_part(name,'/',2)
            and c.customer_id = auth.uid()
            and c.status in ('pending', 'in_progress')
        )
      );
  end if;
end $$;

-- 6) Optional: block deletes from clients (recommended)
-- You can omit delete policies entirely; Edge Functions soft-delete metadata in DB.
-- If you already have a broad delete policy, consider removing/locking it down.

-- Explicitly deny hard-delete from clients (recommended)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='storage' and tablename='objects'
      and policyname='case_documents_no_delete'
  ) then
    create policy case_documents_no_delete
      on storage.objects
      for delete
      to authenticated
      using (false);
  end if;
end $$;

-- 7) Verify what policies are active
-- select policyname, cmd from pg_policies where schemaname='storage' and tablename='objects' order by policyname;
