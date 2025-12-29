-- Migration: Add GDPR consent field to contact_requests
-- Date: 2025-12-27
-- Add gdpr_consent field to track user consent for data processing

ALTER TABLE public.contact_requests
ADD COLUMN IF NOT EXISTS gdpr_consent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS consent_timestamp timestamptz DEFAULT now();