alter table public.gdpr_requests
  add column if not exists ready_at timestamptz null;
