-- Fix for missing gdpr_consent column in contact_requests
-- Run this in Supabase SQL Editor if you get schema cache errors

ALTER TABLE public.contact_requests
ADD COLUMN IF NOT EXISTS gdpr_consent boolean DEFAULT false;

-- Optional: Add consent_timestamp if also missing
ALTER TABLE public.contact_requests
ADD COLUMN IF NOT EXISTS consent_timestamp timestamptz DEFAULT now();

-- After running, click "Refresh schema cache" in the SQL Editor