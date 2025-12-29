ALTER TABLE public.contact_requests ADD COLUMN IF NOT EXISTS gdpr_consent boolean DEFAULT false;
