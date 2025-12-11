-- Migration: Flytta inaktiva kunder från customers till archived_customers
-- Datum: 2025-12-10
-- BESKRIVNING: Detta script flyttar alla kunder med is_customer = false till archived_customers-tabellen
-- och tar sedan bort dem från customers-tabellen

-- ========================================================================
-- STEG 1: Flytta inaktiva kunder till archived_customers (undvik duplicates)
-- ========================================================================
-- Använd INSERT ... ON CONFLICT DO UPDATE för att hantera redan arkiverade kunder
INSERT INTO archived_customers (
  id,
  email,
  name,
  phone,
  is_admin,
  archived_by,
  archived_reason,
  original_created_at,
  original_data,
  archived_at
)
SELECT
  c.id,
  c.email,
  c.name,
  c.phone,
  c.is_admin,
  NULL as archived_by,  -- Vi vet inte vem som arkiverade dem tidigare
  'Migrerad från inaktiva kunder' as archived_reason,
  c.created_at,
  jsonb_build_object(
    'id', c.id,
    'email', c.email,
    'name', c.name,
    'phone', c.phone,
    'is_admin', c.is_admin,
    'created_at', c.created_at,
    'updated_at', c.updated_at
  ) as original_data,
  NOW() as archived_at
FROM customers c
WHERE c.is_customer = false
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  phone = EXCLUDED.phone,
  is_admin = EXCLUDED.is_admin,
  original_data = EXCLUDED.original_data,
  archived_at = NOW();

-- ========================================================================
-- STEG 2: Ta bort inaktiva kunder från customers-tabellen
-- ========================================================================
DELETE FROM customers
WHERE is_customer = false;

-- ========================================================================
-- STEG 3: Lägg till constraint för att säkerställa att customers alltid är aktiva
-- ========================================================================
-- (Kommenterad - kan läggas till senare för extra säkerhet)
-- ALTER TABLE customers ADD CONSTRAINT customers_must_be_active CHECK (is_customer = true);

-- ========================================================================
-- VERIFIERA RESULTATET
-- ========================================================================
-- Kör dessa SELECT-statements för att verifiera migrationen:

-- Antal aktiva kunder i customers-tabellen:
-- SELECT COUNT(*) as active_customers FROM customers WHERE is_customer = true;

-- Antal arkiverade kunder:
-- SELECT COUNT(*) as archived_customers FROM archived_customers;

-- Lista över nyss arkiverade kunder:
-- SELECT id, name, email, archived_at FROM archived_customers WHERE archived_reason = 'Migrerad från inaktiva kunder' ORDER BY archived_at DESC;
