-- Migration: Add read receipt timestamps to cases and subscription_cancellations
-- Description: Adds admin_last_read_at and customer_last_read_at to enable DB-backed read receipts

-- Add read timestamps to cases table
alter table public.cases
  add column if not exists admin_last_read_at timestamptz,
  add column if not exists customer_last_read_at timestamptz;

-- Add read timestamps to subscription_cancellations table
alter table public.subscription_cancellations
  add column if not exists admin_last_read_at timestamptz,
  add column if not exists customer_last_read_at timestamptz;

-- Add indexes for performance
create index if not exists idx_cases_admin_last_read_at on public.cases(admin_last_read_at);
create index if not exists idx_cases_customer_last_read_at on public.cases(customer_last_read_at);
create index if not exists idx_subscription_cancellations_admin_last_read_at on public.subscription_cancellations(admin_last_read_at);
create index if not exists idx_subscription_cancellations_customer_last_read_at on public.subscription_cancellations(customer_last_read_at);

-- Grant update permissions to authenticated users for their own read timestamps
-- RLS policies will control which users can update which timestamps
