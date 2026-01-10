-- Adds JSONB documents storage for cases, mirroring subscription_cancellations.documents.
-- Run this in Supabase SQL editor.

alter table public.cases
add column if not exists documents jsonb not null default '[]'::jsonb;

-- Optional: if you track updated_at via trigger, keep as-is.
