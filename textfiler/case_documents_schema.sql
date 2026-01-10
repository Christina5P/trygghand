-- Case documents (optional normalization)
--
-- NOTE:
-- The current implementation stores documents in `cases.documents` (jsonb)
-- using Edge Functions:
-- - case-create-document-upload
-- - case-attach-document
-- - case-soft-delete-document
--
-- If you want a dedicated table instead (better audit/querying), you can apply
-- this schema and then adjust the Edge Functions + frontend to use it.

create extension if not exists pgcrypto;

create table if not exists public.case_documents (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  path text not null,
  display_name text null,
  mime_type text null,
  uploaded_at timestamptz not null default now(),
  uploaded_by uuid null,
  uploaded_by_role text null,
  deleted_at timestamptz null,
  deleted_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists case_documents_case_id_path_key
  on public.case_documents(case_id, path);

-- Helpful index for admin views
create index if not exists case_documents_case_id_idx
  on public.case_documents(case_id);

-- RLS is project-specific; recommended shape:
-- - customers: select where they own the case
-- - insert/update/delete via Edge Functions (service role)
--
-- alter table public.case_documents enable row level security;
--
-- create policy "case_documents_customer_select"
--   on public.case_documents for select
--   using (
--     exists (
--       select 1 from public.cases c
--       where c.id = case_documents.case_id
--         and c.customer_id = auth.uid()
--     )
--   );
