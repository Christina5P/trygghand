-- Make email optional in contact_requests table
ALTER TABLE public.contact_requests 
ALTER COLUMN email DROP NOT NULL;
