-- Update the status check constraint for contact_requests to only allow current statuses
ALTER TABLE public.contact_requests 
DROP CONSTRAINT IF EXISTS contact_requests_status_check;

ALTER TABLE public.contact_requests 
ADD CONSTRAINT contact_requests_status_check 
CHECK (status IN ('new', 'contacted', 'closed', 'converted'));
