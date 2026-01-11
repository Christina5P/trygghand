-- Adds JSONB documents storage for cases, mirroring subscription_cancellations.documents.
-- Run this in Supabase SQL editor.

alter table public.cases
add column if not exists documents jsonb not null default '[]'::jsonb;

-- Optional: if you track updated_at via trigger, keep as-is.

comment on column public.cases.documents is
'Stores document metadata only (storage paths, timestamps). Must not contain PII or free text.';
    