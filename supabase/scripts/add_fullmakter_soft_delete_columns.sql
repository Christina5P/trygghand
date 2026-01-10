-- Add soft-delete columns to public.fullmakter
--
-- This enables GDPR-friendly deletes from the customer portal (DB-only soft delete).
-- Physical file removal should be admin/Edge Function only.

alter table if exists public.fullmakter
  add column if not exists deleted_at timestamptz null;

alter table if exists public.fullmakter
  add column if not exists deleted_by uuid null;

-- Optional index for faster filtering (safe to run if you want)
-- create index if not exists fullmakter_fullmaktsgivare_deleted_at_idx
--   on public.fullmakter(fullmaktsgivare, deleted_at);
