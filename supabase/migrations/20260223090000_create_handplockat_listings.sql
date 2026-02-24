begin;

-- =========================================================
-- 0) Extensions (MUST be first)
-- =========================================================
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- =========================================================
-- 1) Base table (private)
-- =========================================================
create table if not exists public.handplockat_listings (
  id uuid primary key default gen_random_uuid(),

  title text not null,
  description text not null,

  price_sek integer not null default 0,
  cta_typ text not null default 'direktkop',
  bid_start_sek integer null,

  status text not null default 'available',

  skick text null,

  -- Public-safe pickup info
  pickup_area text not null default 'Sundsvall',
  pickup_window text null,

  -- Keep this for internal use only (NOT exposed in public view)
  pickup_text text null,

  -- IMPORTANT: keep as company number only
  sms_phone text not null,

  payment_method text not null default 'swish',

  source text not null default 'manual',

  -- Private (NOT exposed in public view)
  valuation_json jsonb null,

  -- Images
  -- NOTE: originals may contain sensitive background; do not expose in public view by default
  images_original text[] not null default '{}'::text[],
  image_cutout text null,

  created_at timestamptz not null default now()
);

-- =========================================================
-- 2) Constraints (idempotent)
-- =========================================================
alter table public.handplockat_listings
  drop constraint if exists handplockat_listings_cta_typ_check;
alter table public.handplockat_listings
  add constraint handplockat_listings_cta_typ_check
  check (cta_typ in ('bud', 'direktkop'));

alter table public.handplockat_listings
  drop constraint if exists handplockat_listings_status_check;
alter table public.handplockat_listings
  add constraint handplockat_listings_status_check
  check (status in ('available', 'reserved', 'sold'));

alter table public.handplockat_listings
  drop constraint if exists handplockat_listings_source_check;
alter table public.handplockat_listings
  add constraint handplockat_listings_source_check
  check (source in ('valuation', 'manual'));

-- =========================================================
-- 3) Indexes
-- =========================================================
create index if not exists handplockat_listings_status_idx
  on public.handplockat_listings (status);

create index if not exists handplockat_listings_created_at_idx
  on public.handplockat_listings (created_at desc);

-- Optional search indexes (now safe because pg_trgm is enabled above)
create index if not exists handplockat_listings_title_trgm_idx
  on public.handplockat_listings using gin (title gin_trgm_ops);

create index if not exists handplockat_listings_description_trgm_idx
  on public.handplockat_listings using gin (description gin_trgm_ops);

-- =========================================================
-- 4) RLS + Grants
-- =========================================================
alter table public.handplockat_listings enable row level security;

-- Make sure anon cannot access the table directly except via RLS
revoke all on table public.handplockat_listings from anon;
revoke all on table public.handplockat_listings from authenticated;

-- Authenticated can access but RLS will enforce admin check for writes
grant select, insert, update, delete on table public.handplockat_listings to authenticated;

-- =========================================================
-- 5) Policies on table
-- Requires: public.profiles(id uuid, is_admin boolean)
-- =========================================================
drop policy if exists handplockat_listings_select_anon on public.handplockat_listings;
drop policy if exists handplockat_listings_select_admin on public.handplockat_listings;
drop policy if exists handplockat_listings_insert_admin on public.handplockat_listings;
drop policy if exists handplockat_listings_update_admin on public.handplockat_listings;
drop policy if exists handplockat_listings_delete_admin on public.handplockat_listings;

-- Public read (anon) only active listings
create policy handplockat_listings_select_anon
  on public.handplockat_listings
  for select
  to anon
  using (status in ('available', 'reserved'));

-- Admin read (authenticated)
create policy handplockat_listings_select_admin
  on public.handplockat_listings
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.is_admin = true
    )
  );

-- Admin insert
create policy handplockat_listings_insert_admin
  on public.handplockat_listings
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.is_admin = true
    )
  );

-- Admin update
create policy handplockat_listings_update_admin
  on public.handplockat_listings
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.is_admin = true
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.is_admin = true
    )
  );

-- Admin delete
create policy handplockat_listings_delete_admin
  on public.handplockat_listings
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.is_admin = true
    )
  );

-- =========================================================
-- 6) Public VIEW (GDPR-safer)
-- Exposes ONLY safe columns, hides valuation_json, pickup_text, originals
-- =========================================================
drop view if exists public.handplockat_listings_public;

create view public.handplockat_listings_public as
select
  id,
  title,
  description,
  price_sek,
  cta_typ,
  bid_start_sek,
  status,
  skick,
  pickup_area,
  pickup_window,
  sms_phone,
  payment_method,
  source,
  -- show only cutout publicly
  image_cutout,
  created_at
from public.handplockat_listings;

grant select on public.handplockat_listings_public to anon;
grant select on public.handplockat_listings_public to authenticated;

-- =========================================================
-- 7) Storage buckets + policies
-- =========================================================

-- Buckets
insert into storage.buckets (id, name, public)
values ('handplockat-public', 'handplockat-public', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('handplockat-private', 'handplockat-private', false)
on conflict (id) do nothing;

-- Clean up policies
drop policy if exists "handplockat_public_read" on storage.objects;
drop policy if exists "handplockat_public_insert_admin" on storage.objects;
drop policy if exists "handplockat_public_update_admin" on storage.objects;
drop policy if exists "handplockat_public_delete_admin" on storage.objects;

drop policy if exists "handplockat_private_read_admin" on storage.objects;
drop policy if exists "handplockat_private_insert_admin" on storage.objects;
drop policy if exists "handplockat_private_update_admin" on storage.objects;
drop policy if exists "handplockat_private_delete_admin" on storage.objects;

-- Public bucket: read for everyone
create policy "handplockat_public_read"
  on storage.objects
  for select
  to public
  using (bucket_id = 'handplockat-public');

-- Public bucket: admin-only write
create policy "handplockat_public_insert_admin"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'handplockat-public'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

create policy "handplockat_public_update_admin"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'handplockat-public'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  )
  with check (
    bucket_id = 'handplockat-public'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

create policy "handplockat_public_delete_admin"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'handplockat-public'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

-- Private bucket: admin-only read/write
create policy "handplockat_private_read_admin"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'handplockat-private'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

create policy "handplockat_private_insert_admin"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'handplockat-private'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

create policy "handplockat_private_update_admin"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'handplockat-private'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  )
  with check (
    bucket_id = 'handplockat-private'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

create policy "handplockat_private_delete_admin"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'handplockat-private'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

commit;