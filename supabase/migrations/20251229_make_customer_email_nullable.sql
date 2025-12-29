-- Migration: Make email nullable in customers table and allow customers without auth accounts
-- Date: 2025-12-29
-- Allow customers without email addresses and without auth user accounts

-- First drop the unique constraint on email
ALTER TABLE public.customers
DROP CONSTRAINT IF EXISTS customers_email_key;

-- Drop the foreign key constraint to auth.users
ALTER TABLE public.customers
DROP CONSTRAINT IF EXISTS customers_id_fkey;

-- Make email nullable
ALTER TABLE public.customers
ALTER COLUMN email DROP NOT NULL;

-- Add customer_id column to contact_requests to link converted contacts to customers
ALTER TABLE public.contact_requests
ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL;